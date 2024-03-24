const path = require('path');

module.exports = {
    selectors: {
        WHATSAPP_URL: 'https://web.whatsapp.com',
        QR_CODE_SELECTOR: 'canvas[aria-label="Scan me!"]',
        CONTACT_OPEN_NEW_CHAT: 'span[data-icon="new-chat-outline"]',
        CONTACT_NAME_SEARCH: 'p.selectable-text.copyable-text.iq0m558w.g0rxnol2',
        CONTACT_TYPE_MESSAGE: 'div[contenteditable="true"][title="Type a message"]',
        CONTACT_FIELD_PHONE_NUMBER: 'div.a4ywakfo.qt60bha0 span._11JPr.selectable-text.copyable-text span.enbbiyaj.e1gr2w1z.hp667wtd',
        CONTACT_PHONE_NUMBER: 'span[aria-label], span.selectable-text.copyable-text',
        CHATS_ROW: '[role="row"]',
        CHAT_NAME: '[dir="auto"]._11JPr',
        CHAT_TIME_MESASGE: '.aprpv14t',
        CHAT_LAST_MESSAGE: '[dir="ltr"]._11JPr',
        CHAT_STATUS_CHECK_MESSAGE: '[data-icon="status-check"]',
        CHAT_STATUS_DOUBLE_CHECK_MESSAGE: '[data-icon="status-dblcheck"]',
        POST_SEND_MESSAGE: 'span[data-icon="send"]',
        GET_MESSAGE_TYPE_BOX: 'div[contenteditable="true"][role="textbox"][title="Type a message"]',
        GET_MESSAGE_FIELD_MESSAGES: 'div.copyable-text',
        GET_MESSAGE_TEXT: 'data-pre-plain-text',
        MAP_FILTER_CHAT: 'span[data-icon="filter"]',
        MAP_FILTER_SELECT_GROUPS: 'span[data-icon="group"]',
        MAP_FILTER_SELECT_CONTACTS: 'span[data-icon="contacts"]',
        MAP_SCROLL: '#pane-side',
        BAR_MENU: 'span[data-icon="menu"]',
        CLICK_BUTTON: 'div[role="button"]',
        SCROLL_MAP: 'div[role="row"] div._21S-L span[dir="auto"]',
        MESSAGE_TYPE_BOX_SELECTOR: 'div.lhggkp7q.qq0sjtgm.jxacihee.c3x5l3r8.b9fczbqn.t35qvd06.m62443ks.rkxvyd19.c5h0bzs2.bze30y65.kao4egtt'

    },
    paths: {
        TOKEN_DATA_PATH: path.join(__dirname, '..', 'data', 'tokenData.json'),
        CONTACTS_NAME_PATH: path.join(__dirname, '..', 'data', 'contactsName.json'),
        CONTACTS_NUMBERS_PATH: path.join(__dirname, '..', 'data', 'contactsData.json'),
        GROUPS_NAME_PATH: path.join(__dirname, '..', 'data', 'groupsName.json')
    },
    vars: {
        EMOJI_REGEX: /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        PHONE_REGEX: /^\+55\s\d{2}\s\d{4,5}-\d{4}$/,
        USER_AGENT: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
        WAIT_UNTIL: 'networkidle2'
    }
};

function getContactMenuBarSelector(contactName, loop) {
    if (!loop) {
        return `span[title="${contactName}"]`;
    } else {
        return `span[title="${contactName} "]`;
    }
}

module.exports.getContactMenuBarSelector = getContactMenuBarSelector;