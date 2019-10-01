$(document).ready(function(){
    var DEFAULT_PLANID = "49316MN1070001";
    var envs = environments; // see main

    var props = {};

    // {{rates_path}}/products/medical/plans/3d9c7c71-4860-496e-8880-bbbe0f830b4d/2020/49316MN1070001/info/links?effectiveDate=2020-01-01
    var planDocumentsPage = {
        setProp: function(name, val){
            props[name] = val;
        },
        getProp: function(name) {
            return props[name] || null;
        },
        prop: function(name, val){
            if(val){
                this.setProp(name, val);
                return this;
            }
            return this.getProp(name);
        },
        populateTable: function(tableId, dataPromise){
            return new Promise((resolve, reject) =>
            {
                var _this = this;
                if(!_.isString(tableId)){
                    throw new Error("tableId must be a string");
                }
                if(!_.isFunction(dataPromise)){
                    throw new Error("dataPromise must be a function that returns a promise and resolves to data in the shape of the specified tableId");
                }
                if(!tableId.startsWith("#")){
                    tableId = `#${tableId}`;
                }
                dataPromise()
                    .then(function(data){
                        var tableName = tableId.substring(1),
                            columns = [];

                        if(data.length > 0){
                            for(var prop in data[0]){
                                columns.push({title: prop});
                            }
                        }
                        var arrayOfArrays = [];
                        _.each(data, item => arrayOfArrays.push(obj.toArray(item)));
                        _this.setProp(`${tableName}_data`, data);
                        _this.setProp(`${tableName}_table`, $(tableId).DataTable({
                            select: true,
                            data: arrayOfArrays,
                            columns: columns
                        }))
                        resolve(data);
                    })
                    .catch(reject);
            });
        },
        load: function(){
            var _this = this;
            this.populateTable("#documentNames", planDetails.getPdfFileNames);
            this.populateTable("#planIds", planDetails.getPlanIds).then(function(){

            });
            this.populateTable("#planDocumentMappings", () => planDetails.getMappings("MedicalJan012020.csv"));
            debugger;
            this.populateTable("#fixPlanLinks", () => {
                return new Promise((resolve, reject) => {
                    planDetails.getFixedProductLinks()
                        .then(data => {
                            console.log(data);
                            var munged = [];
                            _.each(data, (datum) => {
                                munged.push({
                                    planId: datum.planId,
                                    id: datum.link.id,
                                    title: datum.link.title,
                                    link: datum.link.link,
                                    type: datum.link.type,
                                    subType: datum.link.subType
                                })
                            });
                            debugger;
                            resolve(munged);
                        })
                        .catch(reject);
                });
            })
            .then(fixedLinks => {
                _this.getProp("fixPlanLinks_table").on("select", function(e, dt, type, indexes) {
                    if(type === 'row'){
                        console.log(indexes);
                        var data = dt.rows(indexes);
                        console.log(data);
                    }
                });              
            });
        },
        ratesPath: function getRatesPath(){
            return envs.getRatesPath();
        },
        quotingPath: function getQuotingPath(){
            return envs.getQuotingPath();
        },
        planId: function getPlanId(){
            return $("#planId").val() || '';
        },
        planYear: function getPlanYear(){
            return $("#planYear").val() || '';
        },
        planMonth: function getPlanMonth(){
            return $("#planMonth").val() || '';
        },
        getSelectedPlanLinks: function(){
            return new Promise((resolve, reject) => {

                var selectedEnv = $("#vimlyEnv option:selected").text(); 
                envs.setCurrent(selectedEnv);                        
                envs.getAuthorizationHeader(selectedEnv)
                    .then(header => {
                            var ratesPath = planDocumentsPage.ratesPath(),
                            planId = planDocumentsPage.planId(),
                            planYear = planDocumentsPage.planYear(),
                            planMonth = planDocumentsPage.planMonth(),
                            xhr = bam.xhr();
            
                        var getUrl = `${ratesPath}/products/medical/plans/3d9c7c71-4860-496e-8880-bbbe0f830b4d/${planYear}/${planId}/info/links?effectiveDate=${planYear}-${planMonth}-01`;
                        
                        xhr.get(header, getUrl)
                            .then(x => {
                                var data = JSON.parse(x.responseText);
                                resolve(data);
                            })
                            .catch(reject);
                    })
                    .catch(reject);
            });
        },
        getAuthorizationHeader: function(){
            var selectedEnv = $("#vimlyEnv option:selected").text(); 
            envs.setCurrent(selectedEnv);                        
            return envs.getAuthorizationHeader(selectedEnv);
        },
        updateFixedLinks: function(){
            var oneLink = planDocumentsPage.prop("fixPlanLinks_data")[0];
            var planId = oneLink.planId;
            var link = _.clone(oneLink);
            delete link.planId;
            console.log(planId);
            console.log(link);
            this.updateLink(planId, link);
        },        
        updateLink: function(planId, link){
            return new Promise((resolve, reject) => {
                var ratesPath = planDocumentsPage.ratesPath();
                //{{rates_path}}/products/medical/plans/3d9c7c71-4860-496e-8880-bbbe0f830b4d/2020/49316MN1070001/info/links/4fc6caf7-0794-3d4a-af5d-8554aa788dfe?effectiveDate=2020-01-01
                var putUrl = `${ratesPath}/products/medical/plans/3d9c7c71-4860-496e-8880-bbbe0f830b4d/2020/${planId}/info/links/${link.id}?effectiveDate=2020-01-01`;
                this.getAuthorizationHeader()
                    .then(authHeader => {
                        debugger;
                        bam.xhr().put(link, authHeader, putUrl)
                            .then(x => {
                                var data = JSON.parse(x.responseText);
                                resolve(data);
                            })
                            .catch(reject);
                    })
            });
        },
        clearMessages: function(){
            $("#messages").val("");
        },
        printMessage: function(msg, append){
            if(!append){
                this.clearMessages();
            }
            var currentOutput = $("#messages").val() || '';
            $("#messages").val((currentOutput + '\r\n' + msg).trim());
        },
        runAdHocScript: function(){
            var scriptText = $("#adHocScript").val();
            eval(scriptText);
        },
        attachEventHandlers: function(){
            $("#planLinksSearchButton").off('click').on('click', function(){
                planDocumentsPage.getSelectedPlanLinks();
            });   
            $("#adHocScriptRunButton").off('click').on('click', function(){
                planDocumentsPage.runAdHocScript();
            });
            $("#fixStuffButton").off('click').on('click', function(){
                planDocumentsPage.updateFixedLinks();
            });
        },
        getLinkUpdateUrl: function(options){
            var opts = _.extend({}, {
                quotingPath: this.getQuotingPath(),
                planId: DEFAULT_PLANID,

            }, options);

        },
        test:function(msg){
            this.printMessage(msg);
        },
        getSbcPutTemplate: function(){
            var propName = "sbcPutTemplate";
            var sbcPutTemplate = this.prop(propName);
            if(!sbcPutTemplate) {
                var templateSource = $("#sbcLinkPutTemplate").val();
                sbcPutTemplate = handlebars.compile(templateSource);
                this.prop(propName, sbcPutTemplate);
            }
            return sbcPutTemplate;
        },
        renderSbcPutTemplate: function(model){
            return this.getSbcPutTemplate()(model);
        },
        renderPutLinks: function(){
            var selectedEnv = $("#vimlyEnv option:selected").text(); 
            envs.setCurrent(selectedEnv);  
            var quotingPath = envs.getQuotingPath();
            _.each(planDocumentsPage.prop("planIds"), planId => {
                var putUrl = this.renderSbcPutTemplate({
                    quotingPath: quotingPath,
                    planId: planId,
                    effectiveYear: this.planYear(),
                    effectiveMonth: this.planMonth()
                })
            });
        }
    }

    planDocumentsPage.load();
    planDocumentsPage.attachEventHandlers();

    window.planDocumentPage = planDocumentsPage;
    window.planDocs = planDocumentsPage;
})