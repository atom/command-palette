/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import EtchComponent from '../etch-component'
import OmnipaletteItem from './omnipalette-item'
import TextEditorView from './text-editor-view'

let fuzzyFilter

export default class Omnipalette extends EtchComponent {
  constructor (props) {
    super(props)

    // let _this = this
    // TODO: Take this out - just for validation purposes now
    // this.props = {
    //   maxItems: Infinity,
    //   scheduleTimeout: null,
    //   inputThrottle: 50,
    //   cancelling: false
    // }
  }

  renderList () {
    if (!this.props.items) return

    let filteredItems = this.props.items
    if (this.props.filterQuery && this.props.filterQuery.length) {
      fuzzyFilter = fuzzyFilter || require('fuzzaldrin').filter
      filteredItems = fuzzyFilter(this.props.items, this.props.filterQuery, {
        key: this.getFilterKey()
      })
    }

    return filteredItems.filter((item, i) => {
      return i < this.props.maxItems
    })
      .map((item, i) => {
        return (
          <OmnipaletteItem selected={this.props.selectedItem === i} item={item} />
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
        <TextEditorView mini />
        <ol className='list-group'>
          {this.renderList()}
        </ol>
      </div>
    )
  }
}
