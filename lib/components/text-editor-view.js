/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import EtchComponent from '../etch-component'

export default class TextEditorView extends EtchComponent {
  constructor (props) {
    super(props)
    // FIXME: Sketchy workaround for etch stripping custom attributes from custom components
    this.refs.textEditor.addMiniAttribute()
    this.refs.textEditor.focus()
    this.props.setTextEditor(this.refs.textEditor)
  }

  render () {
    return (
      <div>
        <atom-text-editor ref='textEditor' />
      </div>
    )
  }
}
