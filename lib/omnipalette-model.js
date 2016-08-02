/** @babel */

import {Emitter} from 'atom'
import Omnipalette from './components/omnipalette'

export default class OmnipaletteModel {
  constructor () {
    this.emitter = new Emitter()

    // Move out of here - use constructor params instead
    this.state = {
      items: [],
      selectedItem: null,
      alternateScoring: atom.config.get('command-palette.useAlternateScoring')
    }
    this.view = new Omnipalette(this.state)
  }

  setState (newState) {
    if (newState && typeof newState === 'object') {
      let {state} = this
      this.state = Object.assign({}, state, newState)

      this.didChange()
    }
  }

  onDidChange (callback) {
    this.emitter.on('did-change', callback)
  }

  didChange () {
    this.emitter.emit('did-change')
  }

  selectNextItemView () {
    this.setState({
      selectedItem: this.state.selectedItem + 1
    })
  }

  selectPreviousItemView () {
    this.setState({
      selectedItem: this.state.selectedItem - 1
    })
  }

  toggle () {
    this.panel = this.panel || atom.workspace.addModalPanel({item: this})
    this.panel.show()
  }

  setupChangeHandlers () {
    this.onDidChange(() => {
      this.view.update(this.state)
    })

    atom.config.onDidChange('command-palette.useAlternateScoring', ({newValue}) => {
      this.didChange()
    })
  }
}
