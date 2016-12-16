/** @babel */

import assert from 'assert'
import _ from 'underscore-plus'
import CommandPaletteView from '../lib/command-palette-view'

describe('CommandPaletteView', () => {
  let workspaceElement

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace)
    document.body.appendChild(workspaceElement)
  })

  afterEach(() => {
    workspaceElement.remove()
  })

  describe('toggle', () => {
    describe('when an element is focused', () => {
      it('shows a list of all valid command descriptions, names, and keybindings for the previously focused element', async () => {
        const editor = await atom.workspace.open()
        editor.element.focus()
        const commandPalette = new CommandPaletteView()
        await commandPalette.toggle()
        const keyBindings = atom.keymaps.findKeyBindings({target: editor.element})
        for (const {name, displayName} of atom.commands.findCommands({target: editor.element})) {
          const eventLi = workspaceElement.querySelector(`[data-event-name='${name}']`)
          assert.equal(eventLi.querySelector('span').textContent, displayName)
          assert.equal(eventLi.querySelector('span').title, name)
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
        document.activeElement.blur()
        const commandPalette = new CommandPaletteView()
        await commandPalette.toggle()
        const keyBindings = atom.keymaps.findKeyBindings({target: workspaceElement})
        for (const {name, displayName} of atom.commands.findCommands({target: workspaceElement})) {
          const eventLi = workspaceElement.querySelector(`[data-event-name='${name}']`)
          assert.equal(eventLi.querySelector('span').textContent, displayName)
          assert.equal(eventLi.querySelector('span').title, name)
          for (const binding of keyBindings) {
            if (binding.command === name) {
              assert(eventLi.textContent.includes(_.humanizeKeystroke(binding.keystrokes)))
            }
          }
        }
      })
    })

    describe('when document.body has focus', () => {
      it('uses the root view as the element to display and dispatch events to', async () => {
        document.body.focus()
        const commandPalette = new CommandPaletteView()
        await commandPalette.toggle()
        const keyBindings = atom.keymaps.findKeyBindings({target: workspaceElement})
        for (const {name, displayName} of atom.commands.findCommands({target: workspaceElement})) {
          const eventLi = workspaceElement.querySelector(`[data-event-name='${name}']`)
          assert.equal(eventLi.querySelector('span').textContent, displayName)
          assert.equal(eventLi.querySelector('span').title, name)
          for (const binding of keyBindings) {
            if (binding.command === name) {
              assert(eventLi.textContent.includes(_.humanizeKeystroke(binding.keystrokes)))
            }
          }
        }
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
      assert.equal(document.activeElement.closest('atom-text-editor'), editor.element)
      assert.equal(commandPalette.selectListView.element.offsetHeight, 0)
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
    it("highlights exact matches", async () => {
      const commandPalette = new CommandPaletteView()
      await commandPalette.toggle()
      commandPalette.selectListView.refs.queryEditor.setText('Application: About')
      await commandPalette.selectListView.update()
      const matches = commandPalette.selectListView.element.querySelectorAll('.character-match')
      assert.equal(matches.length, 1)
      assert.equal(matches[0].textContent, 'Application: About')
    })

    it("highlights partial matches", async () => {
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

    it("highlights multiple matches in the command name", async () => {
      const commandPalette = new CommandPaletteView()
      await commandPalette.toggle()
      commandPalette.selectListView.refs.queryEditor.setText('ApplicationAbout')
      await commandPalette.selectListView.update()
      const matches = commandPalette.selectListView.element.querySelectorAll('.character-match')
      assert.equal(matches.length, 2)
      assert.equal(matches[0].textContent, 'Application')
      assert.equal(matches[1].textContent, 'About')
    })
  })
})
