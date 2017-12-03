/** @babel */

import _ from 'underscore-plus'
import assert from 'assert'
import semver from 'semver'
import sinon from 'sinon'
import CommandPaletteView from '../lib/command-palette-view'
import {CompositeDisposable} from 'event-kit'

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

  describe('toggle', () => {
    describe('when an element is focused', () => {
      it('shows a list of all valid command descriptions, names, and keybindings for the previously focused element', async () => {
        const editor = await atom.workspace.open()
        editor.element.focus()

        // To assert pure item rendering logic, disable render-on-visible behavior by passing Infinity to constructor.
        const commandPalette = new CommandPaletteView(Infinity)
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

  describe('hidden commands', () => {
    it('does not show commands that are marked as `hiddenInCommandPalette` by default, then *only* shows those commands when showHiddenCommands is invoked', async () => {
      const commandsDisposable = atom.commands.add('*', 'foo:hidden-in-command-palette', {
        hiddenInCommandPalette: true,
        didDispatch () {}
      })

      const commandPalette = new CommandPaletteView()
      await commandPalette.toggle()

      assert(!commandPalette.selectListView.props.items.find(item => item.name === 'foo:hidden-in-command-palette'))

      await commandPalette.show(true)
      assert.equal(commandPalette.selectListView.props.items.length, 1)
      assert.equal(commandPalette.selectListView.props.items[0].name, 'foo:hidden-in-command-palette')
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

      let disposable
      beforeEach(() => {
        disposable = new CompositeDisposable()
      })

      afterEach(() => {
        disposable.dispose()
      })

      it('highlights partial matches in the description', async () => {
        disposable.add(atom.commands.add('*', 'foo:with-description', {
          displayName: 'A Custom Display Name',
          description: 'Awesome description here',
          didDispatch () {}
        }))

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
        disposable.add(atom.commands.add('*', 'foo:with-tags', {
          displayName: 'A Custom Display Name',
          tags: ['bar', 'baz'],
          didDispatch () {}
        }))

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

  describe('return placeholder element for invisible item for better performance', () => {
    it('return placeholder element for first 10 items on initial toggle', async () => {
      const commandPalette = new CommandPaletteView()
      const spy = sinon.spy(commandPalette.selectListView.props, 'elementForItem')
      await commandPalette.toggle()

      const initiallyVisibleItemCount = 10
      assert.equal(spy.args.length, commandPalette.selectListView.items.length)
      spy.args.forEach((arg, index) => {
        const innerText = spy.returnValues[index].innerText
        if (index < initiallyVisibleItemCount) {
          assert.notEqual(innerText, "")
        } else {
          assert.equal(innerText, "")
        }
      })
    })
  })

  describe('`command-palette:copy-display-name` and `command-palette:copy-command-name`', () => {
    beforeEach(() => {
      atom.commands.add('*', {
        'test-xxxxx-command:command-one': () => {},
        'test-xxxxx-command:command-two': () => {},
        'test-xxxxx-command:command-three': () => {},
        'test-xxxxx-command:command-four': () => {},
        'test-xxxxx-command:command-five': () => {},
      })
    })

    it('[by keyboard shortcut] copy name for selected item', async () => {
      const spy = sandbox.spy(atom.clipboard, 'write')

      const commandPalette = new CommandPaletteView()
      const selectListView = commandPalette.selectListView
      await commandPalette.toggle()

      selectListView.selectItem(selectListView.items.find(item => item.name === "test-xxxxx-command:command-one"))
      atom.commands.dispatch(selectListView.element, 'command-palette:copy-display-name')
      assert(spy.calledWith("`Test Xxxxx Command: Command One`"))
      atom.commands.dispatch(selectListView.element, 'command-palette:copy-command-name')
      assert(spy.calledWith("`test-xxxxx-command:command-one`"))

      spy.reset()
      selectListView.selectItem(selectListView.items.find(item => item.name === "test-xxxxx-command:command-two"))
      atom.commands.dispatch(selectListView.element, 'command-palette:copy-display-name')
      assert(spy.calledWith("`Test Xxxxx Command: Command Two`"))
      atom.commands.dispatch(selectListView.element, 'command-palette:copy-command-name')
      assert(spy.calledWith("`test-xxxxx-command:command-two`"))
    })

    it('[by context menu] copy name for selected item', async () => {
      const spy = sandbox.spy(atom.clipboard, 'write')

      const commandPalette = new CommandPaletteView()
      const selectListView = commandPalette.selectListView
      await commandPalette.toggle()

      selectListView.refs.queryEditor.setText('xxxxx')
      await selectListView.update()
      const elements = Array.from(selectListView.refs.items.children)
      assert.equal(elements.length, 5)

      const elementOne = selectListView.element.querySelector("[data-event-name='test-xxxxx-command:command-one']")
      atom.commands.dispatch(elementOne, 'command-palette:copy-display-name-from-context-menu')
      assert(spy.calledWith("`Test Xxxxx Command: Command One`"))
      atom.commands.dispatch(elementOne, 'command-palette:copy-command-name-from-context-menu')
      assert(spy.calledWith("`test-xxxxx-command:command-one`"))

      spy.reset()
      const elementTwo = selectListView.element.querySelector("[data-event-name='test-xxxxx-command:command-two']")
      atom.commands.dispatch(elementTwo, 'command-palette:copy-display-name-from-context-menu')
      assert(spy.calledWith("`Test Xxxxx Command: Command Two`"))
      atom.commands.dispatch(elementTwo, 'command-palette:copy-command-name-from-context-menu')
      assert(spy.calledWith("`test-xxxxx-command:command-two`"))

      spy.reset()
      const elementThree = selectListView.element.querySelector("[data-event-name='test-xxxxx-command:command-three']")
      atom.commands.dispatch(elementThree, 'command-palette:copy-display-name-from-context-menu')
      assert(spy.calledWith("`Test Xxxxx Command: Command Three`"))
      atom.commands.dispatch(elementThree, 'command-palette:copy-command-name-from-context-menu')
      assert(spy.calledWith("`test-xxxxx-command:command-three`"))

      spy.reset()
      const elementFour = selectListView.element.querySelector("[data-event-name='test-xxxxx-command:command-four']")
      atom.commands.dispatch(elementFour, 'command-palette:copy-display-name-from-context-menu')
      assert(spy.calledWith("`Test Xxxxx Command: Command Four`"))
      atom.commands.dispatch(elementFour, 'command-palette:copy-command-name-from-context-menu')
      assert(spy.calledWith("`test-xxxxx-command:command-four`"))

      spy.reset()
      const elementFive = selectListView.element.querySelector("[data-event-name='test-xxxxx-command:command-five']")
      atom.commands.dispatch(elementFive, 'command-palette:copy-display-name-from-context-menu')
      assert(spy.calledWith("`Test Xxxxx Command: Command Five`"))
      atom.commands.dispatch(elementFive, 'command-palette:copy-command-name-from-context-menu')
      assert(spy.calledWith("`test-xxxxx-command:command-five`"))
    })

    describe('core:copy behavior with command-palette.copySelectedItemTextWhenEmptySelection setting', () => {
      let spy, selectListView
      beforeEach(async () => {
        spy = sandbox.spy(atom.clipboard, 'write')

        const commandPalette = new CommandPaletteView()
        selectListView = commandPalette.selectListView
        await commandPalette.toggle()

        selectListView.refs.queryEditor.setText('xxxxx')
        await selectListView.update()
        assert.equal(selectListView.getSelectedItem().name, 'test-xxxxx-command:command-one')
        const elements = Array.from(selectListView.refs.items.children)
        assert.equal(elements.length, 5)
      })

      it('[value = "none"]: copy line text', async () => {
        atom.config.set("command-palette.copySelectedItemTextWhenEmptySelection", "none")
        atom.commands.dispatch(selectListView.refs.queryEditor.element, 'core:copy')
        assert(spy.calledWith("xxxxx")) // default behavoir of atom-text-editor
      })

      it('[value = "display-name"]: copy displayName of selected item', async () => {
        atom.config.set("command-palette.copySelectedItemTextWhenEmptySelection", "display-name")
        atom.commands.dispatch(selectListView.refs.queryEditor.element, 'core:copy')
        assert(spy.calledWith("`Test Xxxxx Command: Command One`"))
      })

      it('[value = "command-name]": copy command name of selected item', async () => {
        atom.config.set("command-palette.copySelectedItemTextWhenEmptySelection", "command-name")
        atom.commands.dispatch(selectListView.refs.queryEditor.element, 'core:copy')
        assert(spy.calledWith("`test-xxxxx-command:command-one`"))
      })
    })
  })
})
