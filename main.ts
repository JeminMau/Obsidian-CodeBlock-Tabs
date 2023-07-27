import { Plugin, App, PluginSettingTab, Setting, TextComponent, Notice, setIcon } from "obsidian";
import { type MarkdownPostProcessor, MarkdownPreviewRenderer } from "obsidian";

interface CodeBlockTabsSettings {
	extraLang: {[key: string]: boolean};
    defaultTitle: string;
}

const DEFAULT_SETTINGS: CodeBlockTabsSettings = {
	extraLang: {"dataview":true, "dataviewjs":false},
    defaultTitle: "(x)"
}

class CBTSettingTab extends PluginSettingTab {
	plugin: CodeBlockTabsPlugin;
    private textComponent: TextComponent;
    private pp: Readonly<Record<string, MarkdownPostProcessor>>;

	constructor(app: App, plugin: CodeBlockTabsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
        
        // @ts-expect-error: private
        this.pp = MarkdownPreviewRenderer.codeBlockPostProcessors
	}

    rebuildView(lang: string): void {
        if(this.pp.hasOwnProperty(lang)){
            this.plugin.rebuildView()
        }
    }

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
        containerEl.addClass("cbt-settings")
        // containerEl.createEl("h3", { text: "General" });
		// new Setting(containerEl).setHeading().setName("General")

		new Setting(containerEl)
            .setName('Default tab title')
            .setDesc('When no lang is set in the codeblock, this title will be displayed on the tab.')
            .addText(text => {
                text.setValue(this.plugin.settings.defaultTitle)
                .setPlaceholder(DEFAULT_SETTINGS.defaultTitle)
                .onChange( title =>{
                    title = title.trim()
                    this.plugin.settings.defaultTitle = title.length >0 ? title : DEFAULT_SETTINGS.defaultTitle
                    this.plugin.saveSettings();
                })
            })

		new Setting(containerEl)
			.setName('Add new lang')
            .setDesc('Add a plugin registerd language of codeblock.')
            .addText(text => {
                text.setPlaceholder('lang');
                this.textComponent = text;
            })
			.addButton(btn => {
                btn.setClass("mod-cta")
                    .setButtonText("+")
                    .onClick(async () => {
                        const lang = this.textComponent.getValue().trim().toLowerCase();
                        if (lang.length === 0 || lang.match(/^[\S]+$/) === null) {
                          return;
                        }
                        
                        this.plugin.settings.extraLang[lang] = this.pp.hasOwnProperty(lang)
                        await this.plugin.saveSettings();
                        this.display();

                        this.rebuildView(lang);
                    });
            })

        for (const [lang, enable] of Object.entries(this.plugin.settings.extraLang)) {
            let cls: string = this.pp.hasOwnProperty(lang) ? "mod-success" : "mod-warning"
            let tips: string = this.pp.hasOwnProperty(lang) ? "Registerd" : "Not registerd"
            let icon: string = this.pp.hasOwnProperty(lang) ? "check-circle" : "alert-circle"

            setIcon( new Setting(this.containerEl)
                .setName(lang)
                .addToggle((toggle) =>{
                    toggle.setValue(enable)
                    .onChange(enable =>{
                        this.plugin.settings.extraLang[lang] = enable;
                        this.plugin.saveSettings();

                        this.rebuildView(lang);
                    })
                })
                .addButton((btn) => {
                    btn.setIcon('trash')
                    .setClass("clickable-icon")
                    .onClick(async () => {
                        if(this.plugin.settings.extraLang[lang]){
                            this.rebuildView(lang);
                        }

                        delete this.plugin.settings.extraLang[lang]
                        await this.plugin.saveSettings();
                        this.display();
                        new Notice('Extra language is successfully deleted.');
                    });
                })
                .nameEl.createEl("span", {
                    cls: cls, 
                    attr: {
                        "aria-label": tips
                    }
                })
                , icon
            )
        }
	}
}

export default class CodeBlockTabsPlugin extends Plugin {
	settings: CodeBlockTabsSettings;
    
    rebuildView(): void{
        this.app.workspace.iterateAllLeaves((leaf) => {
            if( leaf.getViewState().type === "markdown") {
                // @ts-expect-error: private
                leaf.rebuildView()
            }
        });
    }
    
	async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); 
        this.rebuildView();
    }
	async saveSettings() { await this.saveData(this.settings); }

	onunload() { 
        //
        // Monkey Patching: begin(recover)
        //

        //@ts-expect-error: private
        MarkdownPreviewRenderer.unregisterCodeBlockPostProcessor = function (e) {
            delete this.codeBlockPostProcessors[e];
        }

        //@ts-expect-error: private
        MarkdownPreviewRenderer.registerCodeBlockPostProcessor = function (e, t) {
            var n = this.codeBlockPostProcessors;
            if (n.hasOwnProperty(e)) throw new Error("Code block postprocessor for language ".concat(e, " is already registered"));
            n[e] = t;
        }

        //
        // Monkey Patching: end(recover)
        //

        this.rebuildView();
        console.log("CodeBlock-Tabs", " is unloaded.")
    }
    
    async onload()   {
        console.log("CodeBlock-Tabs", " is loaded.")

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CBTSettingTab(this.app, this));
		await this.loadSettings();

        //
        // Monkey Patching: begin
        //

        let plugin = this;

        //@ts-expect-error: private
        MarkdownPreviewRenderer.unregisterCodeBlockPostProcessor = function (e) {
            if(this.codeBlockPostProcessors.hasOwnProperty(e) && plugin.settings.extraLang[e]){
                plugin.rebuildView();
            }

            delete this.codeBlockPostProcessors[e];
        }

        //@ts-expect-error: private
        MarkdownPreviewRenderer.registerCodeBlockPostProcessor = function (e, t) {
            let n = this.codeBlockPostProcessors;
            if (n.hasOwnProperty(e)) throw new Error("Code block postprocessor for language ".concat(e, " is already registered"));
            n[e] = t;

            if(plugin.settings.extraLang[e]){
                plugin.rebuildView();
            }
        }

        //
        // Monkey Patching: end
        //

        let codeblockCount: number = 0
        let lastEl: HTMLElement, tabs: HTMLElement, tabContents: HTMLElement

        // el not support appChild, only children
        // tab, tabContent click event && not share
        let addTab = (el: HTMLElement) => {
            // tab
            let tab: HTMLElement = tabs.createEl("li", {cls: "tab-item"})

            const lang: string | undefined = Array.from(el.children[0].classList)
                .filter((a: string)=> a.includes("language-"))
                .map((l: string) => l.split("language-").at(-1))[0]

            tab.innerText = lang ? lang : this.settings.defaultTitle //"(x)"

            // for test
            const dataMeta: string | null = el.children[0].getAttr("data-meta");
            if(dataMeta){
                try {
                    tab.innerText = JSON.parse( decodeURI(dataMeta).replace(/'/g, '"') ).title
                } catch (error) {
                    // console.error('err json string: ', error.message);
                }
            }

            // tab content
            let tabContent: HTMLElement = tabContents.createEl("div", {cls: "tab-content"})
            tabContent.appendChild(el.childNodes[0])

            // active (first tab)
            if( codeblockCount===1 ){
                tab.addClass("active")
                tabContent.addClass("active")
            }
            
            // tab click listener
            tab.addEventListener('click', function() {
                this.parentNode?.childNodes.forEach(node =>{
                    if( node instanceof Element)
                        node.removeClass("active")
                })
                this.addClass("active")
    
                tabContent.parentNode?.childNodes.forEach(node =>{
                    if( node instanceof Element)
                        node.removeClass("active")
                })
                tabContent.addClass("active")
            });
        }
        
        this.registerMarkdownPostProcessor((el,ctx) => {
            if(ctx.hasOwnProperty("displayMode")) return;
            //@ts-expect-error: private
            if(ctx.containerEl.matchParent(".markdown-preview-sizer .markdown-preview-section")) return;
            // avoid async for ![[^]]

            let _next: boolean = true
            if( el.childElementCount === 1 ) {
                // supported nodeName or className
                const node = el.children[0]
                switch (node.nodeName) {
                    case "PRE" :
                        _next = false
                        break;

                    case "DIV" :
                        let lang: string = Array.from(node.classList)
                            .filter((a: string)=> a.startsWith("block-language-"))
                            .map((l: string) => l.slice(15))[0]

                        if( lang ){
                            lang = lang.toLowerCase()
                            // ["dataview", "dataviewjs", "boardlist", "board"]
                            if(this.settings.extraLang.hasOwnProperty(lang) && this.settings.extraLang[lang]){
                                _next = false
                            }
                        }
                        break;
                }
            }
            
            if( _next ) {
                codeblockCount = 0
                return
            }

            switch (codeblockCount) {
                case 0:
                    lastEl = el
                    codeblockCount++
                    break
                case 1:
                    lastEl.className = "tab-container"
                    tabs = lastEl.createEl("ul", {cls: "tabs"})
                    tabContents = lastEl.createEl("div", {cls: "tab-contents"})
                    addTab(lastEl)
                default:
                    codeblockCount++
                    addTab(el)
                    break
            }
        }, 0x02070C0C);
    }
}