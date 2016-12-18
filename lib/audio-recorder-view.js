'use babel';

export default class AudioRecorderView {

  constructor(serializedState, recorder) {
    // Create root element
    this.element = document.createElement('div')
    this.element.classList.add('audio-recorder')

    const rec = document.createElement('span')
    rec.classList.add('icon', 'icon-primitive-dot', 'recording-light')
    this.element.appendChild(rec)

    this.rectime = document.createElement('span')
    this.rectime.classList.add('rectime')
    this.timer = 0
    this.rectime.innerText = this.secondsToHms(this.timer)
    this.element.appendChild(this.rectime)

    const stopbtn = document.createElement('button')
    stopbtn.innerText = 'stop recording'
    stopbtn.classList.add('btn')
    stopbtn.onclick = (ev) => {recorder.stop()}
    this.element.appendChild(stopbtn)
    this.handleEscKey = (ev)=> {
      let toppanel = document.querySelectorAll('.modal.overlay.from-top')[0]
      if (ev.code === 'Escape' && toppanel && toppanel.style.display === 'none') {
        recorder.stop()
      }
    }
  }

  secondsToHms (d) {
    d = Number(d)
    var h = Math.floor(d / 3600)
    var m = Math.floor(d % 3600 / 60)
    var s = Math.floor(d % 3600 % 60)
    return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s)
  }


  // Returns an object that can be retrieved when package is activated
  serialize() {}

  onStartRecording () {
    this.onStopRecording()
    atom.views.getView(atom.workspace).addEventListener('keydown', this.handleEscKey)
    this.timedisplay = setInterval(() => {
      this.rectime.innerText = this.secondsToHms(this.timer++)
    }, 1000)
    this.rectime.innerText = this.secondsToHms(this.timer++)
  }

  onStopRecording () {
    atom.views.getView(atom.workspace).removeEventListener('keydown', this.handleEscKey)
    clearInterval(this.timedisplay)
    this.timer = 0
  }

  // Tear down any state and detach
  destroy() {
    this.onStopRecording()
    this.element.remove()
  }

  getElement() {
    return this.element
  }

}
