//>>built
require({cache:{"url:dijit/form/templates/DropDownButton.html":'<span class="dijit dijitReset dijitInline"\r\n\t><span class=\'dijitReset dijitInline dijitButtonNode\'\r\n\t\tdata-dojo-attach-event="ondijitclick:_onClick" data-dojo-attach-point="_buttonNode"\r\n\t\t><span class="dijitReset dijitStretch dijitButtonContents"\r\n\t\t\tdata-dojo-attach-point="focusNode,titleNode,_arrowWrapperNode"\r\n\t\t\trole="button" aria-haspopup="true" aria-labelledby="${id}_label"\r\n\t\t\t><span class="dijitReset dijitInline dijitIcon"\r\n\t\t\t\tdata-dojo-attach-point="iconNode"\r\n\t\t\t></span\r\n\t\t\t><span class="dijitReset dijitInline dijitButtonText"\r\n\t\t\t\tdata-dojo-attach-point="containerNode,_popupStateNode"\r\n\t\t\t\tid="${id}_label"\r\n\t\t\t></span\r\n\t\t\t><span class="dijitReset dijitInline dijitArrowButtonInner"></span\r\n\t\t\t><span class="dijitReset dijitInline dijitArrowButtonChar">&#9660;</span\r\n\t\t></span\r\n\t></span\r\n\t><input ${!nameAttrSetting} type="${type}" value="${value}" class="dijitOffScreen" tabIndex="-1"\r\n\t\tdata-dojo-attach-point="valueNode"\r\n/></span>\r\n'}});
define("dijit/form/DropDownButton","dojo/_base/declare,dojo/_base/lang,dojo/query,../registry,../popup,./Button,../_Container,../_HasDropDown,dojo/text!./templates/DropDownButton.html".split(","),function(c,d,b,e,f,g,h,i,j){return c("dijit.form.DropDownButton",[g,h,i],{baseClass:"dijitDropDownButton",templateString:j,_fillContent:function(){if(this.srcNodeRef){var a=b("*",this.srcNodeRef);this.inherited(arguments,[a[0]]);this.dropDownContainer=this.srcNodeRef}},startup:function(){if(!this._started){if(!this.dropDown&&
this.dropDownContainer){var a=b("[widgetId]",this.dropDownContainer)[0];this.dropDown=e.byNode(a);delete this.dropDownContainer}this.dropDown&&f.hide(this.dropDown);this.inherited(arguments)}},isLoaded:function(){var a=this.dropDown;return!!a&&(!a.href||a.isLoaded)},loadDropDown:function(a){var b=this.dropDown,c=b.on("load",d.hitch(this,function(){c.remove();a()}));b.refresh()},isFocusable:function(){return this.inherited(arguments)&&!this._mouseDown}})});