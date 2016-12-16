/** @babel */

import SelectListView from 'atom-select-list'
import {humanizeKeystroke} from 'underscore-plus'
import fuzzaldrin from 'fuzzaldrin'
import fuzzaldrinPlus from 'fuzzaldrin-plus'

export default class CommandPaletteView {
  constructor () {
    this.keyBindingsForActiveElement = []
    this.commandsForActiveElement = []
    this.selectListView = new SelectListView({
      items: this.commandsForActiveElement,
      emptyMessage: 'No matches found',
      filterKeyForItem: (item) => item.displayName,
      elementForItem: ({name, displayName}) => {
        const li = document.createElement('li')
        li.classList.add('event')
        li.dataset.eventName = name

        const div = document.createElement('div')
        div.classList.add('pull-right')
        for (const keyBinding of this.keyBindingsForActiveElement) {
          if (keyBinding.command === name) {
            const kbd = document.createElement('kbd')
            kbd.classList.add('key-binding')
            kbd.textContent = humanizeKeystroke(keyBinding.keystrokes)
            div.appendChild(kbd)
          }
        }
        li.appendChild(div)

        const span = document.createElement('span')
        span.title = name

        const query = this.selectListView.getQuery()
        const matches = this.useAlternateScoring ? fuzzaldrinPlus.match(displayName, query) : fuzzaldrin.match(displayName, query)
        let matchedChars = []
        let lastIndex = 0
        for (const matchIndex of matches) {
          const unmatched = displayName.substring(lastIndex, matchIndex)
          if (unmatched) {
            if (matchedChars.length > 0) {
              const matchSpan = document.createElement('span')
              matchSpan.classList.add('character-match')
              matchSpan.textContent = matchedChars.join('')
              span.appendChild(matchSpan)
              matchedChars = []
            }

            span.appendChild(document.createTextNode(unmatched))
          }

          matchedChars.push(displayName[matchIndex])
          lastIndex = matchIndex + 1
        }

        if (matchedChars.length > 0) {
          const matchSpan = document.createElement('span')
          matchSpan.classList.add('character-match')
          matchSpan.textContent = matchedChars.join('')
          span.appendChild(matchSpan)
        }

        const unmatched = displayName.substring(lastIndex)
        if (unmatched) {
          span.appendChild(document.createTextNode(unmatched))
        }

        li.appendChild(span)
        return li
      },
      didConfirmSelection: (keyBinding) => {
        debugger
        this.hide()
        const event = new CustomEvent(keyBinding.name, {bubbles: true, cancelable: true})
        this.activeElement.dispatchEvent(event)
      },
      didCancelSelection: () => {
        this.hide()
      }
    })
    this.selectListView.element.classList.add('command-palette')
  }

  async destroy () {
    await this.selectListView.destroy()
  }

  toggle () {
    if (this.panel && this.panel.isVisible()) {
      this.hide()
      return Promise.resolve()
    } else {
      return this.show()
    }
  }

  async show () {
    if (!this.panel) {
      this.panel = atom.workspace.addModalPanel({item: this.selectListView})
    }

    if (!this.preserveLastSearch) {
      this.selectListView.reset()
    } else {
      this.selectListView.refs.queryEditor.selectAll()
    }

    this.activeElement = (document.activeElement === document.body) ? atom.views.getView(atom.workspace) : document.activeElement
    this.keyBindingsForActiveElement = atom.keymaps.findKeyBindings({target: this.activeElement})
    this.commandsForActiveElement = atom.commands.findCommands({target: this.activeElement})
    this.commandsForActiveElement.sort((a, b) => a.displayName.localeCompare(b.displayName))
    await this.selectListView.update({items: this.commandsForActiveElement})

    this.previouslyFocusedElement = document.activeElement
    this.panel.show()
    this.selectListView.focus()
  }

  hide () {
    this.panel.hide()
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
      this.previouslyFocusedElement = null
    }
  }

  async update (props) {
    if (props.hasOwnProperty('preserveLastSearch')) {
      this.preserveLastSearch = props.preserveLastSearch
    }

    if (props.hasOwnProperty('useAlternateScoring')) {
      this.useAlternateScoring = props.useAlternateScoring
      if (this.useAlternateScoring) {
        await this.selectListView.update({
          filter: (items, query) => {
            return query ? fuzzaldrinPlus.filter(items, query, {key: 'displayName'}) : items
          }
        })
      } else {
        await this.selectListView.update({filter: null})
      }
    }
  }
}
