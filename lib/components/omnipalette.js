/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import EtchComponent from '../etch-component'
import OmnipaletteItem from './omnipalette-item'
import TextEditorView from './text-editor-view'

let fuzzyFilter

export default class Omnipalette extends EtchComponent {
  constructor () {
    super()

    // TODO: Take this out - just for validation purposes now
    // this.props = {
    //   maxItems: Infinity,
    //   scheduleTimeout: null,
    //   inputThrottle: 50,
    //   cancelling: false
    // }
    atom.commands.add(this.element, {
      'core:move-up': (event) => {
        this.props.selectPreviousItemView()
        event.stopPropagation()
      },

      'core:move-down': (event) => {
        this.props.selectNextItemView()
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

  renderList () {
    if (!this.props.items) return

    let filteredItems = []
    if (this.props.filterQuery.length) {
      fuzzyFilter = fuzzyFilter || require('fuzzaldrin').filter
      filteredItems = fuzzyFilter(this.props.items, this.props.filterQuery, {
        key: this.getFilterKey()
      })
    } else {
      filteredItems = this.props.items
    }

    return filteredItems.filter((item, i) => {
      return i < this.props.maxItems
    })
      .map((item) => {
        return (
          <OmnipaletteItem item={item} />
        )
      })
  }

  render () {
    return (
      <div className='select-list'>
        <div className='error-message'>{this.props.errorMessage}</div>
        <div className='loading'>
          <span className='loading-message'></span>
          <span className='badge'></span>
        </div>
        <ol className='list-group'>
          {this.renderList()}
        </ol>
      </div>
    )
  }
}
