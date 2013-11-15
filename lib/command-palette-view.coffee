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

    rootView.command 'command-palette:toggle', => @toggle()

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
      @eventElement = rootView
    @keyBindings = atom.keymap.keyBindingsMatchingElement(@eventElement)

    events = []
    for eventName, eventDescription of _.extend($(window).events(), @eventElement.events())
      events.push({eventName, eventDescription}) if eventDescription

    events = _.sortBy events, (e) -> e.eventDescription

    @setArray(events)
    @appendTo(rootView)
    @miniEditor.focus()

  itemForElement: ({eventName, eventDescription}) ->
    keyBindings = @keyBindings
    $$ ->
      @li class: 'event', 'data-event-name': eventName, =>
        @span eventDescription, title: eventName
        @div class: 'pull-right', =>
          for binding in keyBindings when binding.command is eventName
            @kbd binding.keystroke, class: 'key-binding'

  confirmed: ({eventName}) ->
    @cancel()
    @eventElement.trigger(eventName)
