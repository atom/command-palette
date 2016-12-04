_ = require 'underscore-plus'
{$} = require 'atom-space-pen-views'
CommandPalette = require '../lib/command-palette-view'

describe "CommandPalette", ->
  [palette, workspaceElement, editorElement] = []

  beforeEach ->
    workspaceElement = atom.views.getView(atom.workspace)
    activationPromise = null

    waitsForPromise ->
      atom.workspace.open()

    runs ->
      editorElement = atom.views.getView(atom.workspace.getActiveTextEditor())
      activationPromise = atom.packages.activatePackage("command-palette")

      jasmine.attachToDOM(workspaceElement)
      atom.commands.dispatch(workspaceElement, 'command-palette:toggle')

    waitsForPromise ->
      activationPromise

    runs ->
      palette = $(workspaceElement.querySelector('.command-palette')).view()

  expectCommandsForElement = (element) ->
    keyBindings = atom.keymaps.findKeyBindings(target: element)
    for {name, displayName} in atom.commands.findCommands(target: element)
      eventLi = palette.list.children("[data-event-name='#{name}']")
      expect(eventLi).toExist()
      expect(eventLi.find('span')).toHaveText(displayName)
      expect(eventLi.find('span').attr('title')).toBe(name)
      for binding in keyBindings when binding.command is name
        expect(eventLi.text()).toContain(_.humanizeKeystroke(binding.keystrokes))

  describe "when command-palette:toggle is triggered on the root view", ->
    it "shows a list of all valid command descriptions, names, and keybindings for the previously focused element", ->
      keyBindings = atom.keymaps.findKeyBindings(target: editorElement)
      commands = atom.commands.findCommands(target: editorElement)
      expectCommandsForElement(editorElement)

    it "focuses the mini-editor and selects the first command", ->
      expect(palette.filterEditorView.hasFocus()).toBeTruthy()
      expect(palette.find('.event:first')).toHaveClass 'selected'

    it "clears the previous mini editor text", ->
      palette.filterEditorView.setText('hello')
      atom.commands.dispatch(workspaceElement, 'command-palette:toggle')
      expect(palette.filterEditorView.getText()).toBe ''

  describe "when command-palette:toggle is triggered and the preserveLastSearch setting is enabled", ->
    it "preserves the previous mini editor text", ->
      atom.config.set('command-palette.preserveLastSearch', true)
      palette.filterEditorView.setText('hello')
      palette.cancel()
      atom.commands.dispatch(workspaceElement, 'command-palette:toggle')
      expect(palette.filterEditorView.getText()).toBe 'hello'

  describe "when command-palette:toggle is triggered on the open command palette", ->
    it "focuses the root view and hides the command palette", ->
      expect(palette.isVisible()).toBeTruthy()
      atom.commands.dispatch palette[0], 'command-palette:toggle'
      expect(palette.is(':visible')).toBeFalsy()
      expect(document.activeElement.closest('atom-text-editor')).toBe(editorElement)

  describe "when the command palette is cancelled", ->
    it "focuses the root view and hides the command palette", ->
      expect(palette.is(':visible')).toBeTruthy()
      palette.cancel()
      expect(palette.is(':visible')).toBeFalsy()
      expect(document.activeElement.closest('atom-text-editor')).toBe(editorElement)

  describe "when an command selection is confirmed", ->
    it "hides the palette, then focuses the previously focused element and emits the selected command on it", ->
      eventHandler = jasmine.createSpy('eventHandler').andReturn(false)
      eventName = palette.items[3].name

      atom.commands.add(editorElement, eventName, eventHandler)

      palette.confirmed(palette.items[3])

      expect(document.activeElement.closest('atom-text-editor')).toBe(editorElement)
      expect(eventHandler).toHaveBeenCalled()
      expect(palette.is(':visible')).toBeFalsy()

  describe "when no element has focus", ->
    it "uses the root view as the element to display and trigger events for", ->
      atom.commands.dispatch(workspaceElement, 'command-palette:toggle')
      document.activeElement.blur()
      atom.commands.dispatch(workspaceElement, 'command-palette:toggle')
      expectCommandsForElement(workspaceElement)

  describe "when the body has focus", ->
    it "uses the root view as the element to display and trigger events for", ->
      atom.commands.dispatch(workspaceElement, 'command-palette:toggle')
      document.body.focus()
      atom.commands.dispatch(workspaceElement, 'command-palette:toggle')
      expectCommandsForElement(workspaceElement)

  describe "match highlighting", ->
    beforeEach ->
      jasmine.attachToDOM(workspaceElement)

    it "highlights an exact match", ->
      palette.filterEditorView.getModel().setText('Application: About')
      palette.populateList()
      resultView = palette.getSelectedItemView()

      matches = resultView.find('.character-match')
      expect(matches.length).toBe 1
      expect(matches.last().text()).toBe 'Application: About'

    it "highlights a partial match", ->
      palette.filterEditorView.getModel().setText('Application')
      palette.populateList()
      resultView = palette.getSelectedItemView()

      matches = resultView.find('.character-match')
      expect(matches.length).toBe 1
      expect(matches.last().text()).toBe 'Application'

    it "highlights multiple matches in the command name", ->
      palette.filterEditorView.getModel().setText('ApplicationAbout')
      palette.populateList()
      resultView = palette.getSelectedItemView()

      matches = resultView.find('.character-match')
      expect(matches.length).toBe 2
      expect(matches.first().text()).toBe 'Application'
      expect(matches.last().text()).toBe 'About'
