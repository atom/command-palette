_ = require 'underscore-plus'
{$, $$, SelectListView} = require 'atom'

module.exports =
class CommandPaletteView extends SelectListView
  @activate: ->
    new CommandPaletteView

  keyBindings: null

  initialize: ->
    super

    @addClass('command-palette overlay from-top')
    atom.workspaceView.command 'command-palette:toggle', => @toggle()

  getFilterKey: ->
    'displayName'

  toggle: ->
    if @hasParent()
      @cancel()
    else
      @attach()

  attach: ->
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

    atom.workspaceView.append(this)
    @focusFilterEditor()

  viewForItem: ({name, displayName}) ->
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
