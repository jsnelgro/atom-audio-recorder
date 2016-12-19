'use babel';

/*
TODO:
- bug: recording popup disappears when command palette is opened
*/

import fs from 'fs';
import wav from 'node-wav';
import AudioRecorderView from './audio-recorder-view';
import { CompositeDisposable } from 'atom';

export default {

  audioRecorderView: null,
  modalPanel: null,
  subscriptions: null,
  is_recording: false,
  ctx: new window.AudioContext(),
  vol: null,
  audioIn: null,
  recorder: null,
  buffer_size: 2048,
  media_stream: null,
  left_channel: [],
  right_channel: [],
  recording_length: 0,

  activate(state) {
    this.audioRecorderView = new AudioRecorderView(state.audioRecorderViewState, this);
    this.modalPanel = atom.workspace.addTopPanel({
      item: this.audioRecorderView.getElement(),
      visible: false,
      priority: 200
    })

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'audio-recorder:toggle': () => this.toggle()
    }))
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.audioRecorderView.destroy();
  },

  serialize() {
    return {
      audioRecorderViewState: this.audioRecorderView.serialize()
    };
  },

  mergeBuffers (arrOfBuffs, recording_length) {
      let res = new Float32Array(recording_length)
      let offset = 0
      arrOfBuffs.forEach((buff) => {
        res.set(buff, offset)
        offset += buff.length
      })
      return res
  },

  generateFilename () {
    let filepath = atom.project.getPaths()[0] + '/'
    let filename = 'new-recording'
    let editor = atom.workspace.getActivePaneItem()
    if (editor && editor.buffer && editor.buffer.file) {
      let file = editor.buffer.file
      let patharr = file.path.split('/')
      filename = patharr.pop().split('.')[0]
      filepath = patharr.join('/') + '/'
    }
    let dircontents = fs.readdirSync(filepath)
    let counter = 0
    while (dircontents.includes(filename + '.wav')) {
      if (filename.includes(`-${counter}`)) {
         filename = filename.split(`-${counter}`)
         filename.pop()
      }
      counter++
      filename = `${filename}-${counter}`
    }
    return filepath + filename + '.wav'
  },

  writeWavFile (channelData, sampleRate) {
    let wavFile = wav.encode(channelData, {sampleRate: sampleRate, float: true, bitDepth: 32})
    fs.writeFileSync(this.generateFilename(), new Buffer(wavFile))
  },

  start () {
    this.audioRecorderView.onStartRecording()
    this.is_recording = true
    this.modalPanel.show()
    let success = (media_stream) => {
      this.media_stream = media_stream
      this.vol = this.ctx.createGain()
      this.audioIn = this.ctx.createMediaStreamSource(this.media_stream)
      this.audioIn.connect(this.vol)
      this.recorder = this.ctx.createScriptProcessor(this.buffer_size, 2, 2)
      this.recorder.onaudioprocess = (audio) => {
        let left = audio.inputBuffer.getChannelData(0)
        let right = audio.inputBuffer.getChannelData(1)
        this.left_channel.push(new Float32Array(left))
        this.right_channel.push(new Float32Array(right))
        this.recording_length += this.buffer_size
        if (!this.is_recording) {
          this.stop()
        }
      }
      this.vol.connect(this.recorder)
      this.recorder.connect(this.ctx.destination)
    }

    let fail = (err) => {
      console.log('boo!', err)
    }

    navigator.webkitGetUserMedia({audio: true}, success, fail)
  },

  stop () {
    if (this.media_stream) {
      this.media_stream.getTracks()[0].stop()
      this.vol.disconnect(this.recorder)
      this.recorder.disconnect(this.ctx.destination)
    }

    let lb = this.mergeBuffers(this.left_channel, this.recording_length)
    let rb = this.mergeBuffers(this.right_channel, this.recording_length)
    this.writeWavFile([lb, rb], this.ctx.sampleRate)
    this.left_channel = []
    this.right_channel = []
    this.recording_length = 0
    this.is_recording = false
    this.modalPanel.hide()
    this.audioRecorderView.onStopRecording()
  },

  toggle () {
    return ( this.is_recording ? this.stop() : this.start() )
  }

}
