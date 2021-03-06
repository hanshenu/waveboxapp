import PropTypes from 'prop-types'
import React from 'react'
import MailboxWebViewHibernator from '../MailboxWebViewHibernator'
import CoreService from 'shared/Models/Accounts/CoreService'
import { MailboxLinker, mailboxStore, mailboxActions, GenericMailboxReducer, GenericDefaultServiceReducer } from 'stores/mailbox'
import shallowCompare from 'react-addons-shallow-compare'

const REF = 'mailbox_tab'

export default class GenericMailboxDefaultServiceWebView extends React.Component {
  /* **************************************************************************/
  // Class
  /* **************************************************************************/

  static propTypes = {
    mailboxId: PropTypes.string.isRequired
  }

  /* **************************************************************************/
  // Component lifecycle
  /* **************************************************************************/

  componentDidMount () {
    mailboxStore.listen(this.mailboxChanged)
    if (this.state.isActive) {
      mailboxActions.reduceService.defer(
        this.props.mailboxId,
        CoreService.SERVICE_TYPES.DEFAULT,
        GenericDefaultServiceReducer.clearUnseenNotifications
      )
    }
  }

  componentWillUnmount () {
    mailboxStore.unlisten(this.mailboxChanged)
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.mailboxId !== nextProps.mailboxId) {
      this.setState(this.generateState(nextProps))
    }
  }

  /* **************************************************************************/
  // Data lifecycle
  /* **************************************************************************/

  state = this.generateState(this.props)

  /**
  * Generates the state from the given props
  * @param props: the props to use
  * @return state object
  */
  generateState (props) {
    const mailboxState = mailboxStore.getState()
    const mailbox = mailboxState.getMailbox(props.mailboxId)
    const service = mailbox ? mailbox.serviceForType(CoreService.SERVICE_TYPES.DEFAULT) : null
    return {
      openWindowsExternally: service ? service.openWindowsExternally : false,
      url: service ? service.url : undefined,
      isActive: mailboxState.isActive(props.mailboxId, CoreService.SERVICE_TYPES.DEFAULT)
    }
  }

  mailboxChanged = (mailboxState) => {
    const mailbox = mailboxState.getMailbox(this.props.mailboxId)
    const service = mailbox ? mailbox.serviceForType(CoreService.SERVICE_TYPES.DEFAULT) : null
    this.setState({
      openWindowsExternally: service ? service.openWindowsExternally : false,
      url: service ? service.url : undefined,
      isActive: mailboxState.isActive(this.props.mailboxId, CoreService.SERVICE_TYPES.DEFAULT)
    })
  }

  /* **************************************************************************/
  // Browser Events
  /* **************************************************************************/

  /**
  * Opens a new url in the correct way
  * @param evt: the event that fired
  */
  handleOpenNewWindow = (evt) => {
    if (this.state.openWindowsExternally) {
      MailboxLinker.openExternalWindow(evt.url)
    } else {
      MailboxLinker.openContentWindow(this.props.mailboxId, evt.url, evt.options)
    }
  }

  /**
  * Handles the theme color changing
  * @param evt: the event that fired
  */
  handleThemeColorChanged = (evt) => {
    mailboxActions.reduce(this.props.mailboxId, GenericMailboxReducer.setPageThemeColor, evt.themeColor)
  }

  /**
  * Handles the page favicon updating
  * @param evt: the event that fired
  */
  handlePageTitleUpdated = (evt) => {
    mailboxActions.reduce(this.props.mailboxId, GenericMailboxReducer.setPageTitle, evt.title)
  }

  /**
  * Handles the page favicon updating
  * @param evt: the event that fired
  */
  handlePageFaviconUpdated = (evt) => {
    mailboxActions.reduce(this.props.mailboxId, GenericMailboxReducer.setPageFavicon, evt.favicons)
  }

  /* **************************************************************************/
  // Browser Events : Dispatcher
  /* **************************************************************************/

  /**
  * Dispatches browser IPC messages to the correct call
  * @param evt: the event that fired
  */
  handleIPCMessage = (evt) => {
    switch (evt.channel.type) {
      case 'browser-notification-present': this.handleBrowserNotificationPresented(); break
      default: break
    }
  }

  /**
  * Handles the browser presenting a notification
  */
  handleBrowserNotificationPresented = () => {
    if (!this.state.isActive) {
      mailboxActions.reduceService(
        this.props.mailboxId,
        CoreService.SERVICE_TYPES.DEFAULT,
        GenericDefaultServiceReducer.notificationPresented
      )
    }
  }

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  shouldComponentUpdate (nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }

  componentDidUpdate (prevProps, prevState) {
    if (this.state.isActive && !prevState.isActive) {
      // Not great that we've put this here, but component lifecycle is kinda handled here :-/
      mailboxActions.reduceService.defer(
        this.props.mailboxId,
        CoreService.SERVICE_TYPES.DEFAULT,
        GenericDefaultServiceReducer.clearUnseenNotifications
      )
    }
  }

  render () {
    const { mailboxId } = this.props
    const { url } = this.state

    return (
      <MailboxWebViewHibernator
        ref={REF}
        preload='../platform/webviewInjection/genericDefaultServiceTooling'
        mailboxId={mailboxId}
        url={url}
        serviceType={CoreService.SERVICE_TYPES.DEFAULT}
        newWindow={this.handleOpenNewWindow}
        didChangeThemeColor={this.handleThemeColorChanged}
        pageTitleUpdated={this.handlePageTitleUpdated}
        pageFaviconUpdated={this.handlePageFaviconUpdated}
        ipcMessage={this.handleIPCMessage} />
    )
  }
}
