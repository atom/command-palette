/** @babel */

import {CompositeDisposable} from 'atom'
import CommandPaletteView from './command-palette-view'

class CommandPalettePackage {
  activate (state) {
    this.commandPaletteView = new CommandPaletteView(state)
    this.disposables = new CompositeDisposable()
    this.disposables.add(atom.commands.add('atom-workspace', 'command-palette:toggle', () => {
      this.commandPaletteView.toggle()
    }))
    this.disposables.add(atom.config.observe('command-palette.useAlternateScoring', (newValue) => {
      this.commandPaletteView.update({useAlternateScoring: newValue})
    }))
    this.disposables.add(atom.config.observe('command-palette.preserveLastSearch', (newValue) => {
      this.commandPaletteView.update({preserveLastSearch: newValue})
    }))
    this.disposables.add(atom.config.observe('command-palette.initialOrderingOfItems', (newValue) => {
      this.commandPaletteView.update({initialOrderingOfItems: newValue})
    }))
    return this.commandPaletteView.show()
  }

  serialize() {
    return this.commandPaletteView.serialize()
  }

  async deactivate () {
    this.disposables.dispose()
    await this.commandPaletteView.destroy()
  }
}

const pack = new CommandPalettePackage()
export default pack
