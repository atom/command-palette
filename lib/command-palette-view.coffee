_ = require 'underscore-plus'
{SelectListView, $, $$} = require 'atom-space-pen-views'
{match} = require 'fuzzaldrin'
fuzzaldrinPlus = require 'fuzzaldrin-plus'

module.exports =
class CommandPaletteView extends SelectListView

  @config:
    useAlternateScoring:
      type: 'boolean'
      default: true
      description: 'Use an alternative scoring approach which prefers run of consecutive characters, acronyms and start of words.'
    preserveLastSearch:
      type: 'boolean'
      default: false
      description: 'Preserve the last search when reopening the command palette.'

  @activate: ->
    view = new CommandPaletteView
    @disposable = atom.commands.add 'atom-workspace', 'command-palette:toggle', -> view.toggle()

  @deactivate: ->
    @disposable.dispose()
    @scoreSubscription?.dispose()
    @preserveLastSearchSubscription?.dispose()

  keyBindings: null

  initialize: ->
    super

    @addClass('command-palette')

    @alternateScoring = atom.config.get 'command-palette.useAlternateScoring'
    @scoreSubscription = atom.config.onDidChange 'command-palette.useAlternateScoring', ({newValue}) => @alternateScoring = newValue

    @preserveLastSearch = atom.config.get 'command-palette.preserveLastSearch'
    preserveLastSearchSubscription = atom.config.onDidChange 'command-palette.preserveLastSearch', ({newValue}) => @preserveLastSearch = newValue
    @lastSearch = ''

  getFilterKey: ->
    'displayName'

  cancel: ->
    @lastSearch = @getFilterQuery()
    super

  cancelled: -> @hide()

  toggle: ->
    if @panel?.isVisible()
      @cancel()
    else
      @show()

  show: ->
    if @preserveLastSearch
      @filterEditorView.setText(@lastSearch)
      @filterEditorView.getModel().selectAll()

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
    if @alternateScoring
      matches = fuzzaldrinPlus.match(displayName, filterQuery)
    else
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

  populateList: ->
    if @alternateScoring
      @populateAlternateList()
    else
      super

  # This is modified copy/paste from SelectListView#populateList, require jQuery!
  # Should be temporary
  populateAlternateList: ->

    return unless @items?

    filterQuery = @getFilterQuery()
    if filterQuery.length
      filteredItems = fuzzaldrinPlus.filter(@items, filterQuery, key: @getFilterKey())
    else
      filteredItems = @items

    @list.empty()
    if filteredItems.length
      @setError(null)

      for i in [0...Math.min(filteredItems.length, @maxItems)]
        item = filteredItems[i]
        itemView = $(@viewForItem(item))
        itemView.data('select-list-item', item)
        @list.append(itemView)

      @selectItemView(@list.find('li:first'))
    else
      @setError(@getEmptyMessage(@items.length, filteredItems.length))
