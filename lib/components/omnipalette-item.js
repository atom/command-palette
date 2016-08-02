/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import EtchComponent from '../etch-component'

export default class OmnipaletteItem extends EtchComponent {
  render () {
    return (
      <li>
        {this.props.item.command}
      </li>
    )
  }
}
