export { log_user_message, log_user_action, check_user_whitelist, update_forward_nav, delete_prev_message, capitalise_first, sanitise_for_markdown }

import { Logger } from './logger.js'

function log_user_message(context) {
    Logger.info(context.chat.username + ": " + context.update.message.text + " (" + context.message.message_id + ")")
}

function log_user_action(context) {
    Logger.info(context.chat.username + ": " + context.callbackQuery.data)
}

function check_user_whitelist(context, whitelist) {
    var result = true

    if(!whitelist["whitelist_users"].includes(context.chat.username)) {
        Logger.warn("User whitelist error: " + context.chat.username + " not in whitelist, user's request blocked.")
        result = false
    } else {
        Logger.debug("User in whitelist: " + context.chat.username)
    }

    return result
}

function update_forward_nav(context, new_nav) {
    context.session.nav.push(new_nav)
    Logger.debug(context.chat.username + ": Nav-> precedent: " + context.session.nav[context.session.nav.length-2].fn.name + " | current: " + context.session.nav[context.session.nav.length-1].fn.name)
}

function delete_prev_message(context) {
    if(context.session.prev_message !== undefined) {
        context.deleteMessage(context.session.prev_message)
    }
}

function capitalise_first(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

function sanitise_for_markdown(string) {
    return string
        .replaceAll("_", "\\_")
        .replaceAll("*", "\\*")
        .replaceAll("[", "\\[")
        .replaceAll("`", "\\`")
        .replaceAll(".", "\\.")
}