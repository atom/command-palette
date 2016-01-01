###* @babel ###
###* @jsx etch.dom ###

_ = require 'underscore-plus'
# {SelectListView, $, $$} = require 'atom-space-pen-views'
{match} = require 'fuzzaldrin'
fuzzaldrinPlus = require 'fuzzaldrin-plus'
SelectListComponent = require '/Users/kuychaco/github/select-list-component/src/select-list-component'

module.exports =
class CommandPalette

  @config:
    useAlternateScoring:
      type: 'boolean'
      default: true
      description: 'Use an alternative scoring approach which prefers run of consecutive characters, acronyms and start of words. (Experimental)'

  @activate: ->
    delegate =
      getItems: => @items || []
      cancelled: => @hide()
      confirmed: (item) => @confirmed(item)
      getItem: => @getItem()
      elementForItem: ({name, displayName, eventDescription}) =>
        keystrokes = _.humanizeKeystroke(@keyBindingMap.get(name)?.keystrokes)
        @element = document.createElement('div')
        @element.innerHTML = '
          <div class="pull-right"></div>
          <span title=' + name + '>' + displayName + '</span>'
        if keystrokes?
          @element.getElementsByClassName('pull-right')[0].innerHTML = '<kbd class="key-binding">' + keystrokes + '</kbd>'
        @element

    @component = new SelectListComponent(delegate)
    @disposable = atom.commands.add 'atom-workspace', 'command-palette:toggle', => @toggle()

  @deactivate: ->
    @disposable.dispose()
    @scoreSubscription?.dispose()

  keyBindings: null

  initialize: ->
    super

    @addClass('command-palette')
    @alternateScoring = atom.config.get 'command-palette.useAlternateScoring'
    @scoreSubscription = atom.config.onDidChange 'command-palette.useAlternateScoring', ({newValue}) => @alternateScoring = newValue

  getFilterKey: ->
    'displayName'


  @toggle: ->
    if @panel?.isVisible()
      @component.cancel()
    else
      @show()

  @show: ->
    @component.storeFocusedElement()

    if @previouslyFocusedElement and @previouslyFocusedElement isnt document.body
      @eventElement = @previouslyFocusedElement
    else
      @eventElement = atom.views.getView(atom.workspace)
    keyBindings = atom.keymaps.findKeyBindings(target: @eventElement)
    @keyBindingMap = new Map()
    @keyBindingMap.set(binding.command, binding) for binding in keyBindings

    commands = atom.commands.findCommands(target: @eventElement)
    commands = _.sortBy(commands, 'displayName')
    @items = commands

    @panel ?= atom.workspace.addModalPanel(item: @component.element)
    @component.populate()
    @panel.show()

    @component.focusFilterEditor()

  @hide: ->
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

  @confirmed: ({name}) ->
    @component.cancel()
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
