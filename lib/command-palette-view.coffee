_ = require 'underscore-plus'
{SelectListView, $, $$} = require 'atom-space-pen-views'
{match} = require 'fuzzaldrin'

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
    # Style matched characters in search results
    filterQuery = @getFilterQuery()
    matches = match(displayName, filterQuery)

    $$ ->
      highlighter = (command, matches, offsetIndex) =>
        lastIndex = 0
        matchedChars = [] # Build up a set of matched chars to be more semantic

        for matchIndex in matches
          matchIndex -= offsetIndex
          continue if matchIndex < 0 # If marking up the basename, omit command matches
          unmatched = command.substring(lastIndex, matchIndex)
          if unmatched
            @span matchedChars.join(''), class: 'character-match' if matchedChars.length
            matchedChars = []
            @text unmatched
          matchedChars.push(command[matchIndex])
          lastIndex = matchIndex + 1

        @span matchedChars.join(''), class: 'character-match' if matchedChars.length

        # Remaining characters are plain text
        @text command.substring(lastIndex)

      @li class: 'event', 'data-event-name': name, =>
        @div class: 'pull-right', =>
          for binding in keyBindings when binding.command is name
            @kbd _.humanizeKeystroke(binding.keystrokes), class: 'key-binding'
        @span title: name, -> highlighter(displayName, matches, 0)

  confirmed: ({name}) ->
    @cancel()
    @eventElement.dispatchEvent(new CustomEvent(name, bubbles: true, cancelable: true))
