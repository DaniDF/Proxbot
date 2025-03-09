export {
    get_username, get_sender, get_bot_name, log_user_message, log_user_action, check_user_whitelist, update_forward_nav,
    delete_prev_message, send_updateble_message, send_message, capitalise_first, sanitise_for_markdown, sanitise_input
}

import { Logger } from './logger.js'

function get_username(context) {
    var result
    if(context.message !== undefined) {
        result = context.message.from.username
    } else {
        result = context.callbackQuery.from.username
    }

    return result
}

function get_groupname(context) {
    var result = undefined

    if(context.chat.type !== "private") {
        result = context.chat.title
    }

    return result
}

function get_sender(context) {
    let groupname = get_groupname(context)
    return get_username(context) + ((groupname !== undefined)? "@" + groupname : "")
}

function get_bot_name(context) {
    return context.botInfo.username
}

function log_user_message(context) {
    Logger.info(get_sender(context) + ": " + context.update.message.text + " (" + context.message.message_id + ")")
}

function log_user_action(context) {
    Logger.info(get_sender(context) + ": " + context.callbackQuery.data)
}

function check_user_whitelist(context, whitelist) {
    let username = get_username(context)
    let groupname = get_groupname(context)

    var result
    if(whitelist.whitelist_users.includes(username) && (groupname === undefined || whitelist.whitelist_groups.includes(groupname))) {
        Logger.debug("User in whitelist: " + get_sender(context))
        result = true

    } else if(!whitelist.whitelist_users.includes(username)) {
        Logger.warn("User whitelist error: " + get_sender(context) + " not in whitelist, user's request blocked.")
        result = false

    } else {
        Logger.warn("Group whitelist error: " + get_sender(context) + " not in whitelist, user's request blocked.")
        result = false
    }

    return result
}

function update_forward_nav(context, new_nav) {
    context.session.nav.push(new_nav)
    Logger.debug(
        get_sender(context) + ": Nav --> precedent: " +
        context.session.nav[context.session.nav.length-2].fn.name + " | current: " +
        context.session.nav[context.session.nav.length-1].fn.name
    )
}

function delete_prev_message(context) {
    if(context.session.prev_message !== undefined) {
        try {
            context.deleteMessage(context.session.prev_message)
        } catch (e) {
            Logger.debug("System: trying to delete an already deleted message (" + context.session.prev_message + "), skip.")  //TODO Why is appening?
        }
        
        context.session.prev_message = undefined
    }
}

function send_updateble_message(context, text, args = {}) {
    if(context.session.prev_message === undefined || context.session.prev_chat === undefined) {
        context.reply(text, args).then( (msg_id) => {
            context.session.prev_message = msg_id.message_id
            context.session.prev_chat = context.chat.id
        })
    
    } else {
        args.chat_id = context.session.prev_chat
        args.message_id = context.session.prev_message
        context.editMessageText(text, args)
    }
}

function send_message(context, text, args) {
    context.reply(text, args)
}

function capitalise_first(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

function sanitise_for_markdown(string) {
    const SPECIAL_CHARS = [
        '\\', '_', '*', '[', ']', '(', ')', '~', '`', '>', '<', '&', '#', '+', '-', '=', '|', '{', '}', '.', '!'
    ]

    var result = string
    SPECIAL_CHARS.forEach(char => {
        result = result.replaceAll(char, "\\" + char)
    })

    return result
}

function sanitise_input(string) {
    var result = ""
    for(var count = 0; count < string.length; count++) {
        if(string.charCodeAt(count) >= 32) {
            result += string.charAt(count)
        }
    }

    return result
}