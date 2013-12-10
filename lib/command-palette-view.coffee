{_, $, $$, SelectList} = require 'atom'

module.exports =
class CommandPaletteView extends SelectList
  @activate: ->
    new CommandPaletteView

  @viewClass: ->
    "#{super} command-palette overlay from-top"

  filterKey: 'eventDescription'

  keyBindings: null

  initialize: ->
    super

    atom.workspaceView.command 'command-palette:toggle', => @toggle()

  toggle: ->
    if @hasParent()
      @cancel()
    else
      @attach()

  attach: ->
    super

    if @previouslyFocusedElement[0] and @previouslyFocusedElement[0] isnt document.body
      @eventElement = @previouslyFocusedElement
    else
      @eventElement = atom.workspaceView
    @keyBindings = atom.keymap.keyBindingsMatchingElement(@eventElement)

    events = []
    for eventName, eventDescription of _.extend($(window).events(), @eventElement.events())
      events.push({eventName, eventDescription}) if eventDescription

    events = _.sortBy events, (e) -> e.eventDescription

    @setArray(events)
    @appendTo(atom.workspaceView)
    @miniEditor.focus()

  itemForElement: ({eventName, eventDescription}) ->
    keyBindings = @keyBindings
    $$ ->
      @li class: 'event', 'data-event-name': eventName, =>
        @div class: 'pull-right', =>
          for binding in keyBindings when binding.command is eventName
            @kbd _.humanizeKeystroke(binding.keystroke), class: 'key-binding'
        @span eventDescription, title: eventName

  confirmed: ({eventName}) ->
    @cancel()
    @eventElement.trigger(eventName)
