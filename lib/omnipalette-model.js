/** @babel */

import {Emitter} from 'atom'
import Omnipalette from './components/omnipalette'

export default class OmnipaletteModel {
  constructor () {
    this.emitter = new Emitter()

    // Move out of here - use constructor params instead
    this.state = {
      items: [
        {
          command: 'application:about'
        },
        {
          command: 'application:view-release-notes'
        }
      ],
      maxItems: 50,
      selectedItem: 0,
      alternateScoring: atom.config.get('command-palette.useAlternateScoring')
    }

    this.view = new Omnipalette(Object.assign({}, this.state, {
      selectNextItem: this.selectNextItem,
      selectPreviousItem: this.selectPreviousItem
    }))

    this.setupChangeHandlers()

    let _this = this

    atom.commands.add(this.view.element, {
      'core:move-up': (event) => {
        _this.selectPreviousItem()
        event.stopPropagation()
      },

      'core:move-down': (event) => {
        _this.selectNextItem()
        event.stopPropagation()
      },

      'core:move-to-top': (event) => {
        this.props.selectItemView(this.list.find('li:first'))
        this.list.scrollToTop()
        event.stopPropagation()
      },

      'core:move-to-bottom': (event) => {
        this.props.selectItemView(this.list.find('li:last'))
        this.list.scrollToBottom()
        event.stopPropagation()
      },

      'core:confirm': (event) => {
        this.props.confirmSelection()
        event.stopPropagation()
      },

      'core:cancel': (event) => {
        this.cancel()
        event.stopPropagation()
      }
    })
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

  selectNextItem () {
    if (this.state.selectedItem < this.state.items.length - 1) {
      this.setState({
        selectedItem: this.state.selectedItem + 1
      })
    }
  }

  selectPreviousItem () {
    if (this.state.selectedItem > 0) {
      this.setState({
        selectedItem: this.state.selectedItem - 1
      })
    }
  }

  toggle () {
    this.panel = this.panel || atom.workspace.addModalPanel({item: this})
    this.panel.show()
    this.view.refs.textEditor.focus()
  }

  setupChangeHandlers () {
    this.onDidChange(() => {
      this.view.update({...this.state})
    })

    // this.view.refs.textEditor.getModel().getBuffer().onDidChange(() => {
    //   this.didChange()
    // })

    atom.config.onDidChange('command-palette.useAlternateScoring', ({newValue}) => {
      this.didChange()
    })
  }
}
