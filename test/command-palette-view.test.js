/** @babel */

import _ from 'underscore-plus'
import assert from 'assert'
import semver from 'semver'
import sinon from 'sinon'
import CommandPaletteView from '../lib/command-palette-view'

describe('CommandPaletteView', () => {
  let sandbox
  let workspaceElement

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace)
    document.body.appendChild(workspaceElement)
    document.body.focus()
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
    workspaceElement.remove()
  })

  describe('initial sorting', () => {
    let commandPalette
    const fakeCommands = [
      'one',
      'two',
      'three',
    ].map(command => `command-palette-test:${command}`)

    beforeEach(async () => {
      commandPalette = new CommandPaletteView()
      for (let i=0; i<fakeCommands.length; i++) {
        const command = {
          name: fakeCommands[i],
          displayName: fakeCommands[i].replace(/-/g, ' ')
        }
        atom.commands.add('atom-workspace', command.name, () => {})

        const numTimesToLaunch = fakeCommands.length - i
        //console.log(`Launching ${command.displayName} ${numTimesToLaunch} times`)

        for (j=0; j<numTimesToLaunch; j++) {
          await commandPalette.show()
          await commandPalette.selectListView.refs.queryEditor.setText(command.displayName)
          assert.equal(commandPalette.selectListView.getSelectedItem().name, command.name)
          await commandPalette.selectListView.confirmSelection()
        }
      }
    })

    describe('when initially sorting by frequency', () => {
      beforeEach(async () => {
        await commandPalette.update({initialOrderingOfItems: 'frequency'})
      })

      it('orders the scored items correctly', async () => {
        await commandPalette.show()
        await commandPalette.selectListView.refs.queryEditor.setText('')
        await commandPalette.selectListView.update()

        fakeCommands.forEach(command => {
          const selectedItem = commandPalette.selectListView.getSelectedItem().name
          assert.equal(selectedItem, command)
          commandPalette.selectListView.selectNext()
        })
      })

      it('orders the rest of the palette items alphabetically', async () => {
        await commandPalette.show()
        await commandPalette.selectListView.refs.queryEditor.setText('')
        await commandPalette.selectListView.update()

        commandPalette.selectListView.selectFirst()
        const firstItem = commandPalette.selectListView.getSelectedItem().name

        // skip scored items
        for(let i=0; i<fakeCommands.length; i++) { commandPalette.selectListView.selectNext() }

        // compare pairwise items
        let currentItem, previousItem
        do {
          previousItem = commandPalette.selectListView.getSelectedItem().name
          commandPalette.selectListView.selectNext()
          currentItem = commandPalette.selectListView.getSelectedItem().name
          if(currentItem == firstItem) break;
          assert.equal(previousItem.localeCompare(currentItem), -1)
        }
        while (previousItem != firstItem)
      })

      it('remembers the ordering between launches', async () => {
        const serializedState = commandPalette.serialize();
        const newCommandPalette = new CommandPaletteView(serializedState);

        await newCommandPalette.update({initialOrderingOfItems: 'frequency'})
        await newCommandPalette.show()
        await newCommandPalette.selectListView.refs.queryEditor.setText('')
        await newCommandPalette.selectListView.update()

        fakeCommands.forEach(command => {
          const selectedItem = newCommandPalette.selectListView.getSelectedItem().name
          assert.equal(selectedItem, command)
          newCommandPalette.selectListView.selectNext()
        })
      })
    })

    describe('when initially sorting by recentness', () => {
      beforeEach(async () => {
        await commandPalette.update({initialOrderingOfItems: 'recent'})
      })

      it('orders the scored items correctly', async () => {
        await commandPalette.show()
        await commandPalette.selectListView.refs.queryEditor.setText('')
        await commandPalette.selectListView.update()

        fakeCommands.reverse().forEach(command => {
          const selectedItem = commandPalette.selectListView.getSelectedItem().name
          assert.equal(selectedItem, command)
          commandPalette.selectListView.selectNext()
        })
      })

      it('orders the rest of the palette items alphabetically', async () => {
        await commandPalette.show()
        await commandPalette.selectListView.refs.queryEditor.setText('')
        await commandPalette.selectListView.update()

        commandPalette.selectListView.selectFirst()
        const firstItem = commandPalette.selectListView.getSelectedItem().name

        // skip scored items
        for(let i=0; i<fakeCommands.length; i++) { commandPalette.selectListView.selectNext() }

        // compare pairwise items
        let currentItem, previousItem
        do {
          previousItem = commandPalette.selectListView.getSelectedItem().name
          commandPalette.selectListView.selectNext()
          currentItem = commandPalette.selectListView.getSelectedItem().name
          if(currentItem == firstItem) break;
          assert.equal(previousItem.localeCompare(currentItem), -1)
        }
        while (previousItem != firstItem)
      })

      it('remembers the ordering between launches', async () => {
        const serializedState = commandPalette.serialize();
        const newCommandPalette = new CommandPaletteView(serializedState);

        await newCommandPalette.update({initialOrderingOfItems: 'recent'})
        await newCommandPalette.show()
        await newCommandPalette.selectListView.refs.queryEditor.setText('')
        await newCommandPalette.selectListView.update()

        fakeCommands.reverse().forEach(command => {
          const selectedItem = newCommandPalette.selectListView.getSelectedItem().name
          assert.equal(selectedItem, command)
          newCommandPalette.selectListView.selectNext()
        })
      })
    })

    describe('when initially sorting alphabetically', () => {
      beforeEach(async () => {
        await commandPalette.update({initialOrderingOfItems: 'alphabetic'})
      })

      it('orders the palette items correctly', async () => {
        await commandPalette.show()
        await commandPalette.selectListView.refs.queryEditor.setText('')
        await commandPalette.selectListView.update()

        commandPalette.selectListView.selectFirst()
        const firstItem = commandPalette.selectListView.getSelectedItem().name

        // compare pairwise items
        let currentItem, previousItem
        do {
          previousItem = commandPalette.selectListView.getSelectedItem().name
          commandPalette.selectListView.selectNext()
          currentItem = commandPalette.selectListView.getSelectedItem().name
          if(currentItem == firstItem) break;
          assert.equal(previousItem.localeCompare(currentItem), -1)
        }
        while (previousItem != firstItem)
      })

      it('remembers the ordering between launches', async () => {
        const serializedState = commandPalette.serialize();
        const newCommandPalette = new CommandPaletteView(serializedState);

        await newCommandPalette.update({initialOrderingOfItems: 'recent'})
        await newCommandPalette.show()
        await newCommandPalette.selectListView.refs.queryEditor.setText('')
        await newCommandPalette.selectListView.update()

        commandPalette.selectListView.selectFirst()
        const firstItem = commandPalette.selectListView.getSelectedItem().name

        // compare pairwise items
        let currentItem, previousItem
        do {
          previousItem = commandPalette.selectListView.getSelectedItem().name
          commandPalette.selectListView.selectNext()
          currentItem = commandPalette.selectListView.getSelectedItem().name
          if(currentItem == firstItem) break;
          assert.equal(previousItem.localeCompare(currentItem), -1)
        }
        while (previousItem != firstItem)
      })
    })
  })

  describe('toggle', () => {
    describe('when an element is focused', () => {
      it('shows a list of all valid command descriptions, names, and keybindings for the previously focused element', async () => {
        const editor = await atom.workspace.open()
        editor.element.focus()

        const commandPalette = new CommandPaletteView()
        await commandPalette.toggle()

        const keyBindings = atom.keymaps.findKeyBindings({target: editor.element})
        for (const item of atom.commands.findCommands({target: editor.element})) {
          const {name, description, displayName, tags} = item
          const eventLi = workspaceElement.querySelector(`[data-event-name='${name}']`)
          const displayNameLine = eventLi.querySelector('.primary-line')
          assert.equal(displayNameLine.textContent, displayName)
          assert.equal(displayNameLine.title, name)

          if (description) {
            // just in case it's not the first, need to select the item in order
            // for its description to show
            await commandPalette.selectListView.selectItem(item)

            const descriptionEl = eventLi.querySelector('.secondary-line div')
            assert(descriptionEl)
            assert.equal(descriptionEl.textContent, description)
            assert.equal(descriptionEl.title, description)
          }

          for (const binding of keyBindings) {
            if (binding.command === name) {
              assert(eventLi.textContent.includes(_.humanizeKeystroke(binding.keystrokes)))
            }
          }
        }
      })
    })

    describe('when no element has focus', () => {
      it('uses the root view as the element to display and dispatch events to', async () => {
        const findCommandsSpy = sandbox.spy(atom.commands, 'findCommands')
        const findKeyBindingsSpy = sandbox.spy(atom.keymaps, 'findKeyBindings')

        document.activeElement.blur()
        const commandPalette = new CommandPaletteView()
        await commandPalette.toggle()

        assert(findCommandsSpy.calledWith({target: workspaceElement}))
        assert(findKeyBindingsSpy.calledWith({target: workspaceElement}))
      })
    })

    describe('when document.body has focus', () => {
      it('uses the root view as the element to display and dispatch events to', async () => {
        const findCommandsSpy = sandbox.spy(atom.commands, 'findCommands')
        const findKeyBindingsSpy = sandbox.spy(atom.keymaps, 'findKeyBindings')

        document.body.focus()
        const commandPalette = new CommandPaletteView()
        await commandPalette.toggle()

        assert(findCommandsSpy.calledWith({target: workspaceElement}))
        assert(findKeyBindingsSpy.calledWith({target: workspaceElement}))
      })
    })

    it('focuses the mini-editor and selects the first command', async () => {
      const commandPalette = new CommandPaletteView()
      await commandPalette.toggle()
      assert(commandPalette.selectListView.element.contains(document.activeElement))
      assert(commandPalette.selectListView.element.querySelectorAll('.event')[0].classList.contains('selected'))
    })

    it('clears the previous mini editor text when `preserveLastSearch` is off', async () => {
      const commandPalette = new CommandPaletteView()
      await commandPalette.update({preserveLastSearch: false})
      await commandPalette.toggle()
      commandPalette.selectListView.refs.queryEditor.setText('abc')
      await commandPalette.toggle()
      assert.equal(commandPalette.selectListView.refs.queryEditor.getText(), 'abc')
      await commandPalette.toggle()
      assert.equal(commandPalette.selectListView.refs.queryEditor.getText(), '')
    })

    it('preserves the previous mini editor text when `preserveLastSearch` is on', async () => {
      const commandPalette = new CommandPaletteView()
      await commandPalette.update({preserveLastSearch: true})
      await commandPalette.toggle()
      commandPalette.selectListView.refs.queryEditor.setText('abc')
      await commandPalette.toggle()
      assert.equal(commandPalette.selectListView.refs.queryEditor.getText(), 'abc')
      await commandPalette.toggle()
      assert.equal(commandPalette.selectListView.refs.queryEditor.getText(), 'abc')
    })

    it('hides the command palette and focuses the previously active element if the palette was already open', async () => {
      const editor = await atom.workspace.open()
      const commandPalette = new CommandPaletteView()
      assert.equal(document.activeElement.closest('atom-text-editor'), editor.element)
      assert.equal(commandPalette.selectListView.element.offsetHeight, 0)
      await commandPalette.toggle()
      assert.notEqual(document.activeElement.closest('atom-text-editor'), editor.element)
      assert.notEqual(commandPalette.selectListView.element.offsetHeight, 0)
      await commandPalette.toggle()
      assert.equal(commandPalette.selectListView.element.offsetHeight, 0)
      assert.equal(document.activeElement.closest('atom-text-editor'), editor.element)
      await commandPalette.toggle()
      assert.notEqual(document.activeElement.closest('atom-text-editor'), editor.element)
      assert.notEqual(commandPalette.selectListView.element.offsetHeight, 0)
      commandPalette.selectListView.cancelSelection()
      assert.equal(document.activeElement.closest('atom-text-editor'), editor.element)
      assert.equal(commandPalette.selectListView.element.offsetHeight, 0)
    })
  })

  describe('when selecting a command', () => {
    it('hides the palette, then focuses the previously focused element and dispatches the selected command on it', async () => {
      const editor = await atom.workspace.open()
      editor.element.focus()
      const commandPalette = new CommandPaletteView()
      await commandPalette.toggle()
      await commandPalette.selectListView.selectNext()
      await commandPalette.selectListView.selectNext()
      await commandPalette.selectListView.selectNext()
      let hasDispatchedCommand = false
      atom.commands.add(
        editor.element,
        commandPalette.selectListView.getSelectedItem().name,
        () => { hasDispatchedCommand = true }
      )
      commandPalette.selectListView.confirmSelection()
      assert(hasDispatchedCommand)
      assert.equal(document.activeElement.closest('atom-text-editor'), editor.element)
      assert.equal(commandPalette.selectListView.element.offsetHeight, 0)
    })
  })

  describe('match highlighting', () => {
    it('highlights exact matches', async () => {
      const commandPalette = new CommandPaletteView()
      await commandPalette.toggle()
      commandPalette.selectListView.refs.queryEditor.setText('Application: About')
      await commandPalette.selectListView.update()
      const matches = commandPalette.selectListView.element.querySelectorAll('.character-match')
      assert.equal(matches.length, 1)
      assert.equal(matches[0].textContent, 'Application: About')
    })

    it('highlights partial matches in the displayName', async () => {
      const commandPalette = new CommandPaletteView()
      await commandPalette.toggle()
      commandPalette.selectListView.refs.queryEditor.setText('Application')
      await commandPalette.selectListView.update()
      const matches = commandPalette.selectListView.element.querySelectorAll('.character-match')
      assert(matches.length > 1)
      for (const match of matches) {
        assert.equal(match.textContent, 'Application')
      }
    })

    it('highlights multiple matches in the command name', async () => {
      const commandPalette = new CommandPaletteView()
      await commandPalette.toggle()
      commandPalette.selectListView.refs.queryEditor.setText('ApplicationAbout')
      await commandPalette.selectListView.update()
      const matches = commandPalette.selectListView.element.querySelectorAll('.character-match')
      assert.equal(matches.length, 2)
      assert.equal(matches[0].textContent, 'Application')
      assert.equal(matches[1].textContent, 'About')
    })

    describe('in atom >= 1.21, where object command listeners are supported', () => {
      if (semver.lt(atom.getVersion(), '1.21.0')) {
        // only function listeners are supported, so the `add` method below will fail
        return
      }

      before(() => {
        atom.commands.add(
          '*',
          {
            'foo:with-description': {
              displayName: 'A Custom Display Name',
              description: 'Awesome description here',
              didDispatch () {}
            },
            'foo:with-tags': {
              displayName: 'A Custom Display Name',
              tags: ['bar', 'baz'],
              didDispatch () {}
            }
          }
        )
      })

      it('highlights partial matches in the description', async () => {
        const commandPalette = new CommandPaletteView()
        await commandPalette.toggle()
        commandPalette.selectListView.refs.queryEditor.setText('Awesome')
        await commandPalette.selectListView.update()
        const {element} = commandPalette.selectListView

        const withDescriptionLi = element.querySelector(`[data-event-name='foo:with-description']`)
        const matches = withDescriptionLi.querySelectorAll('.character-match')
        assert(matches.length > 0)
        assert.equal(matches[0].textContent, 'Awesome')
      })

      it('highlights partial matches in the tags', async () => {
        const commandPalette = new CommandPaletteView()
        await commandPalette.toggle()
        commandPalette.selectListView.refs.queryEditor.setText('bar')
        await commandPalette.selectListView.update()
        const {element} = commandPalette.selectListView

        const withTagsLi = element.querySelector(`[data-event-name='foo:with-tags']`)
        const matches = withTagsLi.querySelectorAll('.character-match')
        assert(matches.length > 0)
        assert.equal(matches[0].textContent, 'bar')
      })
    })
  })
})
