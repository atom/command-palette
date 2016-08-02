/** @babel */
import OmnipaletteModel from './omnipalette-model'

export default {
  activate () {
    this.model = new OmnipaletteModel()

    this.disposable = atom.commands.add('atom-workspace', 'command-palette:toggle', () => {
      this.model.toggle()
    })

    atom.views.addViewProvider(OmnipaletteModel, () => {
      return this.model.view.element
    })
  }
}
