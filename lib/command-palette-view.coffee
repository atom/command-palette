_ = require 'underscore-plus'
{SelectListView, $, $$} = require 'atom-space-pen-views'

module.exports =
class CommandPaletteView extends SelectListView
  @activate: ->
    view = new CommandPaletteView
    @disposable = atom.commands.add 'atom-workspace', 'command-palette:toggle', -> view.toggle()

  @deactivate: ->
    @disposable.dispose()

  keyBindings: null

  initialize: ->
    super

    @addClass('command-palette')

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
      @eventElement = @previouslyFocusedElement[0]
    else
      @eventElement = atom.views.getView(atom.workspace)
    @keyBindings = atom.keymaps.findKeyBindings(target: @eventElement)

    commands = atom.commands.findCommands(target: @eventElement)
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

  confirmed: ({name}) ->
    @cancel()
    @eventElement.dispatchEvent(new CustomEvent(name, bubbles: true, cancelable: true))
