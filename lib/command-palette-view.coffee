_ = require 'underscore-plus'
{$, $$} = require 'space-pen'
{SelectListView} = require 'atom-space-pen-views'

module.exports =
class CommandPaletteView extends SelectListView
  @activate: ->
    new CommandPaletteView

  keyBindings: null

  initialize: ->
    super

    @addClass('command-palette')
    atom.workspaceView.command 'command-palette:toggle', => @toggle()

  getFilterKey: ->
    'displayName'

  cancelled: -> @hide()

  toggle: ->
    if @panel?.isVisible()
      @cancel()
    else
      @show()

  show: ->
    @panel ?= atom.workspace.addModalPanel(item: this)
    @panel.show()

    @storeFocusedElement()

    if @previouslyFocusedElement[0] and @previouslyFocusedElement[0] isnt document.body
      @eventElement = @previouslyFocusedElement
    else
      @eventElement = atom.workspaceView
    @keyBindings = atom.keymap.findKeyBindings(target: @eventElement[0])

    if atom.commands?
      commands = atom.commands.findCommands(target: @eventElement[0])
    else
      commands = []
      for eventName, eventDescription of _.extend($(window).events(), @eventElement.events())
        commands.push({name: eventName, displayName: eventDescription, jQuery: true}) if eventDescription

    commands = _.sortBy(commands, 'displayName')
    @setItems(commands)

    @focusFilterEditor()

  hide: ->
    @panel?.hide()

  viewForItem: ({name, displayName, eventDescription}) ->
    keyBindings = @keyBindings
    $$ ->
      @li class: 'event', 'data-event-name': name, =>
        @div class: 'pull-right', =>
          for binding in keyBindings when binding.command is name
            @kbd _.humanizeKeystroke(binding.keystrokes), class: 'key-binding'
        @span displayName, title: name

  confirmed: ({name, jQuery}) ->
    @cancel()
    if jQuery
      @eventElement.trigger name
    else
      @eventElement[0].dispatchEvent(new CustomEvent(name, bubbles: true, cancelable: true))
