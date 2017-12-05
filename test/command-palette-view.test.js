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

  describe('element caching', () => {
    it('caches all items when the query is changed', async () => {
      const commandPalette = new CommandPaletteView(Infinity)
      const spy = sinon.spy(commandPalette.selectListView.props, 'elementForItem')
      await commandPalette.toggle()
      commandPalette.selectListView.items.forEach(item => {
        const selected = commandPalette.selectListView.getSelectedItem() === item
        assert(spy.calledWithMatch(item))
        assert(commandPalette.elementCache.has(item))
        assert(commandPalette.elementCache.get(item).has(`:${selected}`))
        assert(spy.returned(commandPalette.elementCache.get(item).get(`:${selected}`)))
      })

      spy.reset()
      await commandPalette.selectListView.update({query: 'Z'})
      commandPalette.selectListView.items.forEach(item => {
        const selected = commandPalette.selectListView.getSelectedItem() === item
        assert(spy.calledWithMatch(item))
        assert(commandPalette.elementCache.has(item))
        assert(commandPalette.elementCache.get(item).has(`Z:${selected}`))
        assert(spy.returned(commandPalette.elementCache.get(item).get(`Z:${selected}`)))
      })
    })

    it('caches items incrementally when state is changed', async () => {
      const commandPalette = new CommandPaletteView(Infinity)
      const spy = sinon.spy(commandPalette.selectListView.props, 'elementForItem')
      await commandPalette.toggle()
      commandPalette.selectListView.selectIndex((commandPalette.selectListView.selectionIndex + 1), false)
      const selectedItem = commandPalette.selectListView.getSelectedItem()
      assert(!commandPalette.elementCache.get(selectedItem).has(':true'))
      await commandPalette.selectListView.update()
      assert(commandPalette.elementCache.get(selectedItem).has(':true'))
    })

    it('uses cached elements when reactivating', async () => {
      const commandPalette = new CommandPaletteView(Infinity)
      const spy = sinon.spy(commandPalette.selectListView.props, 'elementForItem')
      await commandPalette.toggle()
      const originalItemObjects = commandPalette.selectListView.items
      originalItemObjects.forEach(item => {
        const selected = commandPalette.selectListView.getSelectedItem() === item
        assert(spy.calledWithMatch(item))
        assert(commandPalette.elementCache.has(item))
        assert(commandPalette.elementCache.get(item).has(`:${selected}`))
        assert(spy.returned(commandPalette.elementCache.get(item).get(`:${selected}`)))
      })
      spy.reset()
      await commandPalette.toggle()
      originalItemObjects.forEach(item => {
        const selected = commandPalette.selectListView.getSelectedItem() === item
        assert(spy.neverCalledWithMatch(item))
        assert(commandPalette.elementCache.has(item))
        assert(commandPalette.elementCache.get(item).has(`:${selected}`))
      })
      await commandPalette.toggle()
      originalItemObjects.forEach(item => {
        const selected = commandPalette.selectListView.getSelectedItem() === item
        assert(spy.calledWithMatch(item))
        assert(commandPalette.elementCache.has(item))
        assert(commandPalette.elementCache.get(item).has(`:${selected}`))
        assert(spy.returned(commandPalette.elementCache.get(item).get(`:${selected}`)))
      })
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

  describe('numberOfRecentlyConfirmedCommandsShowsAtTop', () => {
    let commandPalette, disposable, testCommands

    const selectAndConfirmItem = async (item) => {
      await commandPalette.selectListView.selectItem(item)
      const originalDidConfirmSelection = commandPalette.selectListView.props.didConfirmSelection
      await new Promise(resolve => {
        const stub = sinon.stub(commandPalette.selectListView.props, "didConfirmSelection").callsFake((...args) => {
          originalDidConfirmSelection(...args)
          resolve()
          stub.restore()
        })
        commandPalette.selectListView.confirmSelection()
      })
    }

    beforeEach(async () => {
      commandPalette = new CommandPaletteView()
      disposable = atom.commands.add('*', {
        'xxxxx:0': () => {},
        'xxxxx:1': () => {},
        'xxxxx:2': () => {},
        'xxxxx:3': () => {},
        'xxxxx:4': () => {},
      })
      await commandPalette.show()
      testCommands = commandPalette.selectListView.items.filter(item => item.name.startsWith('xxxxx:'))

      assert.equal(testCommands[0].name, "xxxxx:0")
      assert.equal(testCommands[1].name, "xxxxx:1")
      assert.equal(testCommands[2].name, "xxxxx:2")
      assert.equal(testCommands[3].name, "xxxxx:3")
      assert.equal(testCommands[4].name, "xxxxx:4")
      assert.equal(testCommands.length, 5)

      await commandPalette.hide()
    })

    afterEach(() => {
      disposable.dispose()
    })

    it('keep specified nubmer of recentlyConfirmedCommands and show at top', async () => {
      const withItemElements = fn => fn(Array.from(selectListView.element.querySelectorAll('li')))

      const {selectListView} = commandPalette
      await commandPalette.update({numberOfRecentlyConfirmedCommandsShowsAtTop: 3})

      await commandPalette.show()
      await selectAndConfirmItem(testCommands[0])
      await commandPalette.show()
      await withItemElements(elements => {
        assert.equal(elements[0].textContent, testCommands[0].displayName)
      })

      await selectAndConfirmItem(testCommands[1])
      await commandPalette.show()
      await withItemElements(elements => {
        assert.equal(elements[0].textContent, testCommands[1].displayName)
        assert.equal(elements[1].textContent, testCommands[0].displayName)
      })

      await selectAndConfirmItem(testCommands[2])
      await commandPalette.show()
      await withItemElements(elements => {
        assert.equal(elements[0].textContent, testCommands[2].displayName)
        assert.equal(elements[1].textContent, testCommands[1].displayName)
        assert.equal(elements[2].textContent, testCommands[0].displayName)
      })

      await selectAndConfirmItem(testCommands[3])
      await commandPalette.show()
      await withItemElements(elements => {
        assert.equal(elements[0].textContent, testCommands[3].displayName)
        assert.equal(elements[1].textContent, testCommands[2].displayName)
        assert.equal(elements[2].textContent, testCommands[1].displayName)
        assert.notEqual(elements[3].textContent, testCommands[0].displayName)
      })

      await selectAndConfirmItem(testCommands[2])
      await commandPalette.show()
      await withItemElements(elements => {
        assert.equal(elements[0].textContent, testCommands[2].displayName)
        assert.equal(elements[1].textContent, testCommands[3].displayName)
        assert.equal(elements[2].textContent, testCommands[1].displayName)
        assert.notEqual(elements[3].textContent, testCommands[0].displayName)
      })

      commandPalette.selectListView.refs.queryEditor.setText('xxxxx')
      await commandPalette.selectListView.update()
      withItemElements(elements => {
        elements = Array.from(selectListView.element.querySelectorAll('li'))
        const restElements = elements.slice(3)
        assert.equal(elements[0].textContent, testCommands[2].displayName)
        assert.equal(elements[1].textContent, testCommands[3].displayName)
        assert.equal(elements[2].textContent, testCommands[1].displayName)
        assert(!restElements.find(element => element.textContent === testCommands[2].displayName))
        assert(!restElements.find(element => element.textContent === testCommands[3].displayName))
        assert(!restElements.find(element => element.textContent === testCommands[1].displayName))
        assert(restElements.find(element => element.textContent === testCommands[0].displayName))
      })
    })

    it('immediately update size of recentlyConfirmedCommands', async () => {
      await commandPalette.update({numberOfRecentlyConfirmedCommandsShowsAtTop: 3})

      await commandPalette.show()
      await selectAndConfirmItem(testCommands[0])
      await commandPalette.show()
      await selectAndConfirmItem(testCommands[1])
      await commandPalette.show()
      await selectAndConfirmItem(testCommands[2])

      assert.deepEqual(commandPalette.recentlyConfirmedCommands, [testCommands[2], testCommands[1], testCommands[0]])
      await commandPalette.update({numberOfRecentlyConfirmedCommandsShowsAtTop: 2})
      assert.deepEqual(commandPalette.recentlyConfirmedCommands, [testCommands[2], testCommands[1]])
      await commandPalette.update({numberOfRecentlyConfirmedCommandsShowsAtTop: 0})
      assert.deepEqual(commandPalette.recentlyConfirmedCommands, [])
    })
  })
})
