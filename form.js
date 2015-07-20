var Forms = (function() {
    var Base = function() {};
    Base.extend = function(prop) {
        var _super = this.prototype,
            prMethod = function(name, fn) {
                return function() {
                    var tmp = this._super;
                    this._super = _super[name];
                    var ret = fn.apply(this, arguments);
                    this._super = tmp;
                    return ret;
                };
            };
        var prototype = new this();
        for (var name in prop) prototype[name] = typeof prop[name] == "function" && typeof _super[name] == "function" ? prMethod(name, prop[name]) : prop[name];

        function Class() {
            if (this.initialize) this.initialize.apply(this, arguments);
        }

        Class.prototype = prototype;
        Class.prototype.constructor = Class;
        Class.extend = arguments.callee;
        return Class;
    };

        var FormBase = Base.extend({
            $el: null,

            // compile template
            compileTemplate: function() {
                this.$el = $(this.template({
                    field: this.field
                }));
            },

            // set template
            setTemplate: function() {
                if (this.field.template) this.template = this.field.template;
            },

            // render the field
            render: function() {

                // set template
                this.setTemplate();

                // compile template
                this.compileTemplate();

                // hide error message initially
                this.$el.find(".error-message").hide();

                // set attributes if defines
                var $element = this.$el.find("input, select, textarea");
                _.each(this.field.attrs, function(i, ob) {
                    $element.attr(ob, i);
                });

                // call after render if initialize
                if (_.isFunction(this.afterRender)) this.afterRender();
            },

            // do validation on field
            validateField: function() {
                return (this.field.required) ? (this.getValue()) ? true : false : true;
            },

            // show/hide error message
            validate: function() {
                var isValid = this.validateField();
                if (isValid) {
                    this.$el.removeClass('has-error');
                    this.$el.find(".error-message").hide();
                } else {
                    this.$el.addClass('has-error');
                    this.$el.find(".error-message").show();
                }
                return isValid;
            },

            // trigger change event
            triggerOnChange: function() {
                if (_.isFunction(this.field.onChange)) this.field.onChange.apply(this, [this.field, this.getValue()]);
            }
        });

        var Validation = {
            email: function() {
                console.log(this.getValue());
            }
        };

        // Form fields
        var FormFields = {

            // button form field
            button: FormBase.extend({
                // button template
                template: _.template('<span><input class="btn btn-default" value="<%=(field.label)?field.label:\'\'%>" type="<%=(field.buttonType)?field.buttonType:\'button\'%>" id="<%=(field.name)?field.name:\'\'%>"/></span>'),

                // button initialize method
                initialize: function(options) {
                    this.field = options.field;
                    this.form = options.form;
                    this.render();
                    return this;
                },

                // validate form
                validateForm: function() {
                    var valid = true,
                        obj = {},
                        setNameAndValidate = function(ob, name, field) {
                            if (!field.validate() && valid) valid = false;
                            if (_.isFunction(field.getValue)) ob[name] = field.getValue();
                        };

                    _.each(this.form.formFields, function(field) {
                        if(field.name) {
                            if (_.isArray(field.field.subFields)) {
                                obj[field.name] = {};
                                _.each(field.field.subFields, function(subField) {
                                    setNameAndValidate(obj[field.name], subField.field.name, subField);
                                });
                            } else {
                                setNameAndValidate(obj, field.name, field.field);
                            }
                        }
                    });

                    if (valid) {
                        // call the save method
                        if (_.isFunction(this.field.onClick)) this.field.onClick.apply(this, [obj]);
                    }
                },

                render: function() {
                    // call parent class
                    this._super();
                },

                reset: function() {
                    if(confirm("Are you sure, you want t reset the form") && this.form.$el.length)
                        this.form.$el[0].reset();
                },

                // bind click method
                afterRender: function() {
                    // bind events
                        this.$el.find("input").click(function(e) {
                            e.preventDefault();
                            if (this.field.buttonType == "reset") {
                                this.reset();
                            } else if(this.field.isValidation) {
                                this.validateForm();
                            } else {
                                if (_.isFunction(this.field.onClick)) this.field.onClick.apply(this);
                            }
                            
                        }.bind(this));
                }
            }),

            // multi checkbox list field
            multiCheckList: FormBase.extend({
                template: _.template('<div class="form-group"><% if(field.label) { %>' +
                    '<label for="<%=(field.name)?field.name:\'\'%>"><%=field.label%>' +
                    '<% if(field.required) {  %><span>*</span><% } %>' +
                    '</label><% } %>' +
                    '<div class="checkbox">' +
                    '<% for(var i in field.listObj) { %>' +
                    '<label class="checkbox-inline">' +
                    '<input type="checkbox" <%=(_.isArray(field.value) && field.value.indexOf(field.listObj[i][field.config.code]) != -1)?"checked=\'checked\'":""%> name="<%=field.name%>" value="<%=field.listObj[i][field.config.code]%>" />' +
                    '<%=field.listObj[i][field.config.value]%>' +
                    '</label>' +
                    '<% } %>' +
                    '</div><span class="error-message help-block"><%=(field.errorMessage)?field.errorMessage:""%></span></div>'),

                // initialize function
                initialize: function(options) {
                    this.field = options.field;
                    this.render();
                    return this;
                },

                // set value
                setValue: function(val) {
                    this.$el.find("input[value='" + val + "']").attr("checked");
                    this.validate();
                },

                // get value
                getValue: function() {
                    var arr = [];
                    this.$el.find("input:checked").each(function() {
                        arr.push($(this).val());
                    });
                    return arr;
                },

                // after render
                afterRender: function() {
                    // bind events
                    this.$el.find("input").click(function() {
                        this.validate();
                        this.triggerOnChange();
                    }.bind(this));
                }
            }),

            // checkbox field
            checkBox: FormBase.extend({
                template: _.template('<div class="control-group"><% if(field.label) { %>' +
                    '<label class="control-label" for="<%=(field.name)?field.name:\'\'%>"><%=field.label%>' +
                    '</label><% } %>' +
                    '<div class="controls">' +
                    '<label class="checkbox inline">' +
                    '<input type="checkbox" <%=(field.value == field.config.trueValue)?"checked=\'checked\'":""%> name="<%=field.name%>" value="" />' +
                    '</label>' +
                    
                    '</div></div>'),

                // initialize function
                initialize: function(options) {
                    this.field = options.field;
                    if (!this.field.config)
                        this.field.config = {
                            trueValue: 1,
                            falseValue: 0
                        };
                    this.render();
                    return this;
                },

                // get value
                getValue: function() {
                    return (this.$el.find("input").is(":checked"))?this.field.config.trueValue:this.field.config.falseValue;
                },
                // after render
                afterRender: function() {
                    // bind events
                    this.$el.find("input").click(function() {
                        this.validate();
                        this.triggerOnChange();
                    }.bind(this));
                }
            }),

            // Input form field
            input: FormBase.extend({
                template: _.template('<div class="control-group left">' +
                    '<% if(field.label) { %>' +
                    '<label class="control-label" for="<%=(field.name)?field.name:\'\'%>">' +
                    '<%=field.label%>' +
                    '<% if(field.required) {  %>' +
                    '<span>*</span>' +
                    '<% } %>' +
                    '</label>' +
                    '<% } %><div class="controls">' +
                    '<input class="input-xlarge" <%=(field.isDisabled)?"disabled":""%> <%=(field.isReadOnly)?"readonly":""%> id="<%=(field.name)?field.name:\'\'%>" value="<%=(field.value)?field.value:\'\'%>" type="<%=(field.inputType)?field.inputType:\'text\'%>" />' +
                    '<% if(field.note) { %><div class="note"><%=field.note%></div><% } %>'+
                    '<span class=\'error-message help-block\'>' +
                    '<%=(field.errorMessage)?field.errorMessage:\'\'%>' +
                    '</span></div>' +
                    '</div>'),

                // initialize
                initialize: function(options) {
                    this.field = options.field;
                    this.render();
                    return this;
                },

                // set value
                setValue: function(val) {
                    this.$el.find("input").val(val);
                    this.validate();
                },

                // get value
                getValue: function() {
                    return this.$el.find("input").val();
                },

                // after render
                afterRender: function() {
                    // bind events
                    this.$el.find("input").keyup(function() {
                        this.validate();
                        this.triggerOnChange();
                    }.bind(this));
                }
            }),

            // radio form field
            radioBox: FormBase.extend({
                template: _.template('<div class="form-group">' +
                    '<% if(field.label) { %>' +
                    '<label for="<%=(field.name)?field.name:\'\'%>">' +
                    '<%=field.label%>' +
                    '<% if(field.required) { %>' +
                    '<span>*</span>' +
                    '<% } %>' +
                    '</label>' +
                    '<% } %>' +
                    '<div class="radio">' +
                    '<% for(var i in field.options) { %>' +
                    '<label class="radio-inline">' +
                    '<input <%=(field.options[i].value==field.value)? "checked=\'checked\'": ""%> name="<%=(field.name)?field.name: \'\'%>" value="<%=field.options[i].value%>" type="radio" />' +
                    '<%=field.options[i].label%>' +
                    '</label>' +
                    '<% } %>' +
                    '</div><span class=\'error-message help-block\'>' +
                    '<%=(field.errorMessage)?field.errorMessage:\'\'%>' +
                    '</span>' +
                    '</div>'),

                // initialize fn
                initialize: function(options) {
                    this.field = options.field;
                    this.render();
                    return this;
                },

                // set value
                setValue: function(val) {
                    this.$el.find("input[value='" + val + "']").attr("checked");
                    this.validate();
                },

                // get value
                getValue: function() {
                    return this.$el.find("input:checked").val();
                },

                // after render
                afterRender: function() {
                    // bind events
                    this.$el.find("input").click(function() {
                        this.validate();
                        this.triggerOnChange();
                    }.bind(this));
                }
            }),


            // dropdown form field
            DOB: FormBase.extend({

                template: _.template('<div class="control-group">'+
                    '<% if(field.label) { %>' +
                    '<label class="control-label" for="<%=(field.name)?field.name:\'\'%>">' +
                    '<%=field.label%>' +
                    '<% if(field.required) {  %>' +
                    '<span>*</span>' +
                    '<% } %>' +
                    '</label>' +
                    '<% } %><div class="controls">' +
                    '<select class="span1 day">'+
                    '<option value="">Day</option>'+
                    '<% for(var i = 1; i <= 31; i++ ) { %>'+
                    '<option value="<%=i%>"><%=i%></option>'+
                    '<% } %>'+
                    '</select>'+
                    '<select class="span1 month">'+
                    '<option value="">Month</option>'+
                    '<% var l = MW.Static.Date.Month.length;'+
                     'for(var i = 0; i < l; i++) {  %>'+
                        '<option value="<%=MW.Static.Date.Month[i].k%>"><%=MW.Static.Date.Month[i].v%></option>'+
                    '<% } %>'+
                '</select>'+
                '<select class="span1 year">'+
                    '<option value="">Year</option>'+
                    '<% var l = MW.Static.Date.Year.length;'+
                     'for(var i = 0; i < l; i++) {  %>'+
                    '<option value="<%=MW.Static.Date.Year[i]%>"><%=MW.Static.Date.Year[i]%></option>'+
                    '<% } %>'+
                '</select>'+
                '<span class=\'error-message help-block\'>' +
                    '<%=(field.errorMessage)?field.errorMessage:\'\'%>' +
                    '</span>' +
                    '</div></div>'),

                // initialize
                initialize: function(options) {
                    this.field = options.field;
                    if (!this.field.config)
                        this.field.config = {
                            code: "code",
                            value: "name"
                        };

                    this.render();
                    this.setValue();
                    return this;
                },

                // set value
                setValue: function(val) {
                    val = (val)?val:this.field.value;
                    if(val) {
                        var date = new Date(parseInt(val, 10));
                        this.$el.find("select.year").val(date.getFullYear());
                        this.$el.find("select.month").val(date.getMonth() + 1);
                        this.$el.find("select.day").val(date.getDate());
                        this.validate();
                    }
                },

                // get value
                getValue: function() {
                    var date = [];
                    date.push(this.$el.find("select.year").val());
                    date.push(this.$el.find("select.month").val());
                    date.push(this.$el.find("select.day").val());
                    return (date[0] && date[1] && date[2])?new Date(date.join("-")).getTime():"";
                },

                // after render
                afterRender: function() {
                    // bind events
                    this.$el.find("select").change(function() {
                        this.validate();
                        this.triggerOnChange();
                    }.bind(this));
                }
            }),

            // dropdown form field
            dropDown: FormBase.extend({
                template: _.template('<div class="control-group"><% if(field.label) { %>' +
                    '<label class="control-label" for="<%=(field.name)?field.name:\'\'%>">' +
                    '<%=field.label%>' +
                    '<% if(field.required) {  %>' +
                    '<span>*</span>' +
                    '<% } %>' +
                    '</label>' +
                    '<% } %><div class="controls">' +
                    '<select class="form-control" id="<%=(field.name)?field.name:\'\'%>">' +
                    '<option value="">Select...</option>' +
                    '<% for(var i in field.listObj) { %>' +
                    '<option ' +
                    '<%=(field.listObj[i][field.config.code] == field.value)?"selected":""%> ' +
                    'value="<%=field.listObj[i][field.config.code]%>">' +
                    '<%=field.listObj[i][field.config.value]%></option>' +
                    '<% } %>' +
                    '</select>' +
                    '<span class=\'error-message help-block\'>' +
                    '<%=(field.errorMessage)?field.errorMessage:\'\'%>' +
                    '</span></div>' +
                    '</div>'),

                // initialize
                initialize: function(options) {
                    this.field = options.field;
                    if (!this.field.config)
                        this.field.config = {
                            code: "code",
                            value: "name"
                        };

                    this.render();
                    return this;
                },

                // set value
                setValue: function(val) {
                    this.$el.find("select").val(val);
                    this.validate();
                },

                // get value
                getValue: function() {
                    return this.$el.find("select").val();
                },

                // after render
                afterRender: function() {
                    // bind events
                    this.$el.find("select").change(function() {
                        this.validate();
                        this.triggerOnChange();
                    }.bind(this));
                }
            }),

            // textarea form field
            textArea: FormBase.extend({
                template: _.template('<div class="control-group">' +
                    '<% if(field.label) { %>' +
                    '<label class="control-label" for="<%=(field.name)?field.name:\'\'%>">' +
                    '<%=field.label%>' +
                    '<% if(field.required) {  %>' +
                    '<span>*</span>' +
                    '<% } %>' +
                    '</label>' +
                    '<% } %><div class="controls">' +
                    '<textarea class="input-xlarge" id="<%=(field.name)?field.name:\'\'%>"><%=(field.value)?field.value:\'\'%></textarea>' +
                    '<span class=\'error-message help-block\'>' +
                    '<%=(field.errorMessage)?field.errorMessage:\'\'%>' +
                    '</span></div>' +
                    '</div>'),

                // initialize
                initialize: function(options) {
                    this.field = options.field;
                    this.render();
                    return this;
                },

                // set value
                setValue: function(val) {
                    this.$el.find("textarea").val(val);
                    this.validate();
                },

                // get value
                getValue: function() {
                    return this.$el.find("textarea").val();
                },

                // after render
                afterRender: function() {
                    // bind events
                    this.$el.find("textarea").keyup(function() {
                        this.validate();
                        this.triggerOnChange();
                    }.bind(this));
                }
            }),

            // multibox fom field
            multiBox: FormBase.extend({
                subFields: [],
                template: _.template('<div class="control-group">' +
                    '<% if(field.label) { %>' +
                    '<label class="control-label" for="<%=(field.name)?field.name:\'\'%>">' +
                    '<%=field.label%>' +
                    '<% if(field.required) {  %>' +
                    '<span>*</span>' +
                    '<% } %>' +
                    '</label>' +
                    '<% } %>' +
                    '<div class="fields controls"></div>' +
                    '</div>'),

                // initialize
                initialize: function(options) {
                    this.options = options;
                    this.field = this.options.field;
                    this.render();
                    return this;
                },

                // create sub fields
                afterRender: function() {
                    var fieldObj;
                    for (var i in this.options.field.fields) {
                        fieldObj = new FormFields[this.options.field.fields[i].type]({
                            field: this.options.field.fields[i],
                            form: this.options.form
                        });
                        this.subFields.push(fieldObj);
                        this.$el.find('.fields').append(fieldObj.$el);
                    }
                }
            })
        };

        var Field = Base.extend({
            initialize: function() {
                return this;
            },

            create: function(options) {
                if (_.isArray(options.field.fields)) {
                    options.field.type = "multiBox";
                    return new FormFields[options.field.type](options);
                } else {
                    if (FormFields[options.field.type]) return new FormFields[options.field.type](options);
                }
            }
        });

        return Base.extend({
            template: _.template("<form class='form-horizontal <%=(readOnly)?\"view-page\":\"\"%>'></form>"),
            initialize: function(target, fields, readOnly) {
                this.formFields = [];
                this.target = target;
                this.$el = null;
                this.readOnly = readOnly;
                this.setFields(fields);
            },

            setFields: function(fields) {
                this.createFields(fields);
                this.generateFieldsHTML();
                this.appendToDom();
            },

            appendToDom: function() {
                $("#" + this.target).append(this.$el);
            },

            createFields: function(fields) {
                _.each(fields, function(field) {
                    this.formFields.push({
                        name: field.name,
                        field: new Field().create({
                            field: field,
                            form: this
                        })
                    });
                }.bind(this));
            },

            generateFieldsHTML: function() {
                this.$el = $(this.template({readOnly: this.readOnly}));

                _.each(this.formFields, function(field) {
                    console.log("here");
                    if (field.field) this.$el.append(field.field.$el);
                }.bind(this));
            },

            getAllFieldValue: function() {
                var val = {};
                _.each(this.formFields, function(field) {
                    if (field.field.getValue) val[field.name] = field.field.getValue();
                });
                return val;
            }
        });
})();