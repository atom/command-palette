/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import EtchComponent from '../etch-component'

class TextEditorView extends EtchComponent {
  constructor (props) {
    super(props)
    this.update({textEditor: this.refs.textEditor})
  }

  render () {
    return (
      <div>
        <atom-text-editor mini={this.props.mini} ref='textEditor' />
      </div>
    )
  }
}
