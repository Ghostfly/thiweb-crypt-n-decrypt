/**
 * ThiWeb Auto-decrypt | Browser extension
 */
// @ts-check

class TWExtension {
    constructor(){
        this._separator = '{{|}}';
    }

    _addEncryptButton() {
        const buttonsContainer = document.getElementById("format-buttons");

        if(!buttonsContainer){ return; }
    
        const add = document.createElement("button");
        add.className = "button button-secondary";
        // @ts-ignore
        add.innerText = chrome.i18n.getMessage("cryptSelection");
        add.onclick = this._onEncryptButtonClick.bind(this);
    
        buttonsContainer.appendChild(add);
    }

    /**
     * @param {Event} event
     */
    async _onEncryptButtonClick(event){
        event.preventDefault();
        /**
         * @type {HTMLInputElement}
         */
        const textarea = document.querySelector("textarea#message");
        const str = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    
        const encrypted = await this._encrypt(str);
        if(encrypted){
            textarea.value = textarea.value.replace(str, `[code]${encrypted}[/code]`);
        }
    }

    /**
     * Check if ext can be used (logged in)
     * @returns {Promise<boolean>}
     */
    async _check() {    
        if(!document.getElementById('usernameExt')){
            return false; 
        }

        const username = this._username();
        if(!username){
            return false;
        }
        
        return true;
    }

    /**
     * @param {string} str
     * @returns {Promise<null|string>}
     */
    async _encrypt(str) {
        try {
            const req = await fetch(this._endpoint('code', encodeURIComponent(str)));
            const encrypt = await req.json();

            if(!encrypt || !encrypt.message){
                return;
            }
    
            return encrypt.message;
        } catch (err) {
            console.error("Error while encrypt", err);
        }
    
        return null;
    }

    /**
     * @returns {Promise<void>}
     */
    async _decode(){
        if(this._codes.length === 0){
            return;
        }

        try {
            const response = await fetch(this._endpoint('decodeMultiple', this._params())).then(res => res.json());
            if(!response.message || !response.coded){
                return;
            }

            const decoded = response.message.split(this._separator);
            const coded = response.coded.split(this._separator);
    
            let idx = 0;
            for(const codeElement of this._codes){
                if (this._clean(codeElement.innerHTML) == coded[idx]) {
                    let newCode = this._activateLinks(decoded[idx]);
                    const showOriginal = document.createElement('a');
                    showOriginal.style.marginLeft = '5px';
                    showOriginal.href = "#";
                    showOriginal.style.cursor = 'pointer';

                    const code = coded[idx];
                    const clear = decoded[idx];

                    const onDecryptCode = (event) => {
                        event.preventDefault();
                        const parent = newCode.parentElement;
                        const oldCode = newCode;
                        newCode = this._activateLinks(clear);
                        parent.replaceChild(newCode, oldCode);
                        this._blur(newCode);

                        // @ts-ignore
                        showOriginal.innerText = chrome.i18n.getMessage("showOriginal");
                        showOriginal.onclick = onShowCode;
                    };

                    const onShowCode = (event) => {
                        event.preventDefault();
                        newCode.innerText = code;
                        this._blur(newCode);
                        // @ts-ignore
                        showOriginal.innerText = chrome.i18n.getMessage("showDecrypted");
                        showOriginal.onclick = onDecryptCode;
                    };

                    showOriginal.onclick = onShowCode;

                    // @ts-ignore
                    showOriginal.innerText = chrome.i18n.getMessage("showOriginal");
                    codeElement.parentElement.replaceChild(newCode, codeElement);

                    const parentCodeBoxP = newCode.parentElement.parentElement.querySelector('p');
                    parentCodeBoxP.appendChild(showOriginal);

                    newCode.setAttribute('data-origin-twl', coded[idx]);
                    this._blur(newCode);
                    idx++;
                }
            }
        } catch (err){
            console.error("Error while decoding", err);
        }
    }

    /**
     * @param {HTMLElement} elem
     */
    _blur(elem){
        elem.animate([{ filter: 'blur(5px)'}, { filter: 'none' }], { duration: 300 });
    }

    /**
     * @param {string} type
     * @param {string} body
     * @returns {string}
     */
    _endpoint(type, body){
        return `${this._apiURL}${type}&str=${body}`;
    }

    get _apiURL(){
        return "https://live.thiweb.com/api.php?";
    }

    /**
     * @readonly
     * @returns {HTMLCollectionOf<HTMLElement>}
     */
    get _codes(){
        return document.getElementsByTagName('code');
    }

    /**
     * @returns {string|null} username of the user
     */
    _username(){
        /**
         * @type {HTMLSpanElement}
         */
        const usernameContainer = document.querySelector('#usernameExt span');
        if(usernameContainer){
            return usernameContainer.innerText;
        } else {
            return null;
        }
    }

    /**
     * @param {string} str
     * @returns {HTMLElement}
     */
    _activateLinks(str) {
        const codeElement = document.createElement('code');

        const re = /^(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)/mgi;
        /**
         * @type {RegExpExecArray}
         */
        let m;
        while ((m = re.exec(str)) !== null) {
            if (m.index === re.lastIndex) {
                re.lastIndex++;
            }

            for(const match of m){
                str = str.replace(match, "<a href=\"" + match + "\">" + match + "</a>");
            }
        }

        this._insertUnsafeHTML(str, codeElement);
        
        return codeElement;
    }
    
    /**
     * @param {string} str
     * @param {HTMLElement} element
     */
    _insertUnsafeHTML(str, element, clear = false){
        if(clear){
            element.innerHTML = '';
        }

        const parser = new DOMParser();
        const parsedBody = parser.parseFromString(str, 'text/html').body;

        for(let i = 0; i < parsedBody.childNodes.length; i++){
            const tag = parsedBody.childNodes[i];

            if(tag instanceof Text){
                element.append(document.createTextNode(tag.textContent));
            } else if(tag instanceof HTMLAnchorElement){
                element.appendChild(tag.cloneNode(true));
            }
        }

        return element;
    }

    /**
     * @param {string} str
     */
    _clean(str){
        return str.trim().replace(/\n/g,' ');
    }

    /**
     * @returns {string}
     */
    _params(){
        const params = [];

        for(const code of this._codes){
            const cleanup = this._clean(code.innerHTML);
            if (cleanup.startsWith("TWL")) {
                params.push(cleanup);
            }
        }

        return params.join(this._separator);
    }

    /**
     * @returns {Promise<void>}
     */
    async run(){
        if(this._codes.length === 0){
            return;
        }

        const canUse = await this._check();
        if(canUse){
            await this._decode();
    
            if (document.getElementById('message')) {
                this._addEncryptButton();
            }
        }
    }
}

(async function(){
    try {
        const ext = new TWExtension();
        await ext.run();
    } catch (err){
        console.error('Error while running ext', err);
    }
})();
