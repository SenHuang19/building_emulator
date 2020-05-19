var globalBuildingTypes, 
    globalBuildingMap, 
    globalDefaultAppList, 
    globalParametersList,
    c_indx, fileObj;
var globalApplianceList = {}
var globalRedList = []
var sysVariables = { max_nzones: 0 };

/******************************************************************************************

-------------------------------   On Loading the Index Page    ----------------------------
  
*******************************************************************************************/
jQuery(function(){

    // if user decides to make building from scratch
    jQuery('#btn-make-building').on('click', function() {
        try {
            get_btree();
            drw_bld_tree(globalBuildingTypes);
        } catch(err) {
            alert(err.message);
        }
    });

    // if user decides to select one of the available buildings
    jQuery('#select-job-id').on('change', function() {
        $.ajax({
            url: "/query",
            type : "POST",
            data: JSON.stringify({'query_type': 'fetch_model', 'job_id': jQuery(this).find("option:selected").val()}),
            dataType : "html",
            contentType:"application/json",
            success: function(response) {
                res = JSON.parse(response);
                
                // initiate global building map
                globalBuildingMap = res["map"];
                
                // get default appliance list
                getDefaultAppList();    
                    
                if (res.status_code == 0) {
                    // make sure we have the building tree
                    get_btree();

                    // get c_indx to show selection on building box
                    c_indx = globalBuildingMap["building"]["index"];
                    var indx_split = c_indx.split("_");

                    // update left most panel
                    var tempJSON = globalBuildingTypes;
                    for (i = 1; i < indx_split.length-1; i++) {
                        tempJSON = tempJSON["children"][(+indx_split[i])-1];
                    }
                    drw_bld_tree(tempJSON);

                    // check the selected building type
                    jQuery('#' + globalBuildingMap["building"]["type"]).prop('checked', true);

                    // update middle and rightmost containers
                    build_floormap();
                } else {
                    // initiate model page
                    init_modelpage(res);
                }
            },
            error: function(error) {
                console.log("failure!!!");
                console.log(error);
            }
        });
    })
});

/******************************************************************************************

------------------------------   When Building from Scratch    ----------------------------
  
*******************************************************************************************/
// get building tree depicting different types of building available
function get_btree() {
    jQuery.ajax({
        type: "POST",
        url: "/query",
        async: false,
        data: JSON.stringify({"query_type": "get_btree"}),
        dataType : "html",
        contentType: "application/json",
        success: function(response) {
            globalBuildingTypes = JSON.parse(response);
        },
        error: function() {
            alert( "error" );
        }
    })
}

// function to draw building tree
function drw_bld_tree (building_json) {
    
    // Index of clicked building type
    c_indx = building_json.indx;

    // if parent is root, update the legend
    if (building_json["value"] == "building") {
        jQuery("#legend-lmp").text('Select Building Type');
    }

    // remove previous entries from the div
    d3.selectAll('.editable-view').remove();

    // add back button in the div
    d3.select('#fieldset-lmp')
        .append('div')
            .attr("class", "row form-group fieldset-row editable-view")
        .append('div')
            .attr("class", "col-sm-12 back-button-div")
        .append('button')
            .attr("id", "btn-back")
            .attr("type", "button")
            .attr("class", "btn btn-default back-button")
        .on("click", function(){
            back_button(building_json.value)
        });

    // append parent div for all the sub building types
    d3.select('#fieldset-lmp')
        .append('div')
            .attr("class", "row form-group fieldset-row editable-view")
            .attr("id", building_json["value"] + "-type")
    
    // create div for each sub building type 
    var divs = d3.select("#" + building_json["value"] + "-type")
        .selectAll('div')
        .data(building_json["children"])
        .enter()
        .append("div")
            .attr("class", "col-sm-6 selection-box")
            .attr("id", function (d){ return d.value;})

    // create selection tag for every sub building type
    divs.append('input')
            .attr("type", "radio")
            .attr("class", function (d){ 
                if (d.type=="leaf") { 
                    return "form-check-input leafRadio";
                } else {
                    return "form-check-input";
                }
            })
            .attr("id", function (d){ return d.parent + "_" + d.value; })
            .attr("name", function (d){ return d.parent; })
            .attr("value", function (d){ return d.value; })
        .on('change', function(d) {
            if (d.type !="leaf") { 
                // if a parent node, go down to lower level
                c_indx = d.indx;
                drw_bld_tree (d);
            } else {
                // if a leaf node, select the level
                get_floormap(d.parent + "_" + d.value, d.indx);
            }
        });
    
    // image icon for sub building type
    var figs = divs.append('label')
                        .attr("class", function (d) { 
                            if (d.type=="leaf") { 
                                return "form-check-label leaf";
                            } else {
                                return "form-check-label";
                            }
                        })
                        .attr("for", function (d){ return d.parent + "_" + d.value; })
                    .append("figure");
    figs.append("img")
            .attr("class", "label-image")
            .attr("alt", function (d){ return d.name; })
            .attr("src", function (d){ return 'static/icons/' + d.icon; })
    figs.append("figcaption")
            .attr("class", "tag")
            .text(function (d){ return d.name; });
}

// back button in the left most panel
function back_button(b_val) {
    
    // remove panel when changing buildings
    jQuery('#middle-panel').hide();
    jQuery('#right-most-panel').hide();
    
    // change the view to parent building
    var indx_split = c_indx.split("_");
    if (indx_split.length > 1) {
        var tempJSON = globalBuildingTypes;
        for (i = 1; i < indx_split.length-1; i++) {
            tempJSON = tempJSON["children"][(+indx_split[i])-1];
        }
        drw_bld_tree(tempJSON);
    } else {
        // move to index page
        document.location.href = "/";
    }
}

// get floor layout for the selected building
function get_floormap(b_type, b_indx) {
    jQuery.ajax({
        type: "POST",
        url: "/query",
        data: JSON.stringify({"query_type": "get_default_bmap", "build_type": b_type, "build_indx": b_indx}),
        dataType : "html",
        contentType: "application/json",
        success: function(response) {
            globalBuildingMap = JSON.parse(response);
            getDefaultAppList();
            build_floormap();
        },
        error: function() {
            alert( "error" );
        }
    });
}

// layout floor plan in the middle panel
function build_floormap() {

    // remove previous list
    d3.select('#floor-list').selectAll('*').remove();
    
    // get number of floors from the default building file and set in the configuration panel
    var nfloors = Object.keys(globalBuildingMap["building"]["floors"]).length;
    jQuery('#nfloors').val(nfloors);

    // update number of floors
    for (var i=0; i<nfloors; i++) {
        var nZones = Object.keys(globalBuildingMap["building"]["floors"][i]["zones"]).length;
        addFloor(i, nZones);
    }

    // show configuration panel
    jQuery('#middle-panel').show();  

    // update summary table
    generateTable();
    
    // show summary panel
    jQuery('#right-most-panel').show();     

    // if we change the number of floors in the building
    jQuery('#nfloors').on('change', function(){
        update_zones();
    });            
}

// print summary panel
function addFloor(f_no, nZones=1) {

    // select floor panel and compare number of floors with stored system variables
    var floorPanel = d3.select('#floor-list');

    // set number of zones in the new floor
    var currentNZones = nZones;
    if (currentNZones > sysVariables['max_nzones']) { 
        sysVariables['max_nzones'] = currentNZones; 
    }

    // append a floor panel 
    var panel = floorPanel
                    .append('div')
                        .attr('class', 'col-sm-3 floor-div f' + (f_no+1).toString() + '-div')
    
    // add a label in the floor panel
    panel
        .append('label')
            .text('F' + (f_no+1).toString())
            .attr('class', 'col-sm-12')

    // append an input block to write number of zones in the floor
    panel
        .append('div')
            .attr('class', 'col-sm-12 floor-input')
        .append('input')
            .attr('id', 'f' + (f_no+1).toString() + '-zones')
            .attr('name', 'nzones')
            .attr('class', 'form-control floor-input text-center')
            .attr('type', 'text')
            .attr('value', currentNZones)
        .on('change', function() {

            // update global building map
            var floorID = this.id.split('-')[0].toUpperCase();
            var floorNum = parseInt(floorID.split('F')[1]);
            
            // previous number of floors by checking number of cell within the table
            var currentNZones = $("." + floorID + "-row" + " > td").length-1
            var updatedNZones = parseInt(jQuery('#' + this.id).val());

            // if new number of zones are more than previous maximum, update maximum
            if (updatedNZones > sysVariables['max_nzones']) { sysVariables['max_nzones'] = updatedNZones; }
            
            // if new zones are added
            if (updatedNZones > currentNZones) {
                for (var i=currentNZones; i<updatedNZones; i++) {
                    // personalize appliance list
                    var applianceList = globalDefaultAppList;
                    applianceList.forEach(element => element["id"] = ("b_" + floorID + "_Z" + (i+1).toString() + "_" + element["label"]).toLowerCase());

                    // we subtract 1 from floorNum because array is zero indexed
                    globalBuildingMap["building"]["floors"][floorNum-1]["zones"].push({"label":"Z"+(i+1).toString(), "appliances":applianceList});
                    globalRedList.push(floorID + "_Z" + (i+1).toString())
                }
            } 
            else if (updatedNZones < currentNZones) {
                // remove zones from the end
                for (var i=currentNZones-1; i>=updatedNZones; i--) {
                    // we subtract 1 from floorNum because array is zero indexed
                    globalBuildingMap["building"]["floors"][floorNum-1]["zones"].splice(i, 1);
                }
            }

            // update summary table
            generateTable();
        });
}

// update number of floors and number of zones at each floor when number of floors get updated
function update_zones() {

    // list of floor
    var floorPanel = d3.select('#floor-list');

    // previous number of floors
    var currentNFloors = $("#floor-list > div").length
    
    // update number of floors
    var updatedNFloors = parseInt(jQuery('#nfloors').val());
    
    // if now the number of floors is more
    if (updatedNFloors > currentNFloors) {
        
        // add new floors in the building
        for (var i=currentNFloors; i<updatedNFloors; i++) {
            
            // add new floor
            addFloor(i);
            
            // update building configuration json
            globalBuildingMap["building"]["floors"].push({"label":"F"+(i+1).toString()});

            // personalize appliance list
            var applianceList = globalDefaultAppList;
            applianceList.forEach(element => element["id"] = "b_f" + (i+1).toString() + "_" + element["label"].toLowerCase());
            globalBuildingMap["building"]["floors"][i]["appliances"] = applianceList;
            
            var applianceList = globalDefaultAppList;
            applianceList.forEach(element => element["id"] = "b_f" + (i+1).toString() + "_z1_" + element["label"].toLowerCase());
            globalBuildingMap["building"]["floors"][i]["zones"] = [{"label":"Z1", "appliances":applianceList}];

            // add new floors and zones to the red list
            globalRedList.push("F"+(i+1).toString())
            globalRedList.push("F"+(i+1).toString() + "_Z1")
        }
    } 
    // if now the number of floors is less
    else if (updatedNFloors < currentNFloors) {
        // remove floors from the end
        for (var i=currentNFloors-1; i>=updatedNFloors; i--) {
            
            // remove floor
            d3.select('.f' + (i+1).toString() + '-div').remove();
            
            // update json
            globalBuildingMap["building"]["floors"].splice(i, 1);
        }
        
        // update max_nzones
        sysVariables['max_nzones'] = 0
        for (var i=0; i<updatedNFloors; i++) {
            
            var nZones = Object.keys(globalBuildingMap["building"]["floors"][i]["zones"]).length
            if (nZones > sysVariables['max_nzones']) {
                sysVariables['max_nzones'] = nZones;
            }
        }
    }

    // build summary table
    generateTable();
}

// print summary table in the right most panel
function generateTable() {

    // select building box to append table
    var buildingModel = d3.select('.building-box');
    
    // remove previous building model and append a table
    buildingModel.selectAll('*').remove();
    buildingTable = buildingModel.append('table')
                        .attr('class', 'table table-sm table-bordered building-model')
    
    // add body to the table
    var tableBody = buildingTable.append('tbody');
    
    // add floors and zones
    var nfloors = Object.keys(globalBuildingMap["building"]["floors"]).length;
    for (var i=nfloors-1; i>=0; i--) {

        // add a row to each floor
        floorRow = tableBody.append('tr').attr('class', 'F' + (i+1).toString() + '-row')

        // get number of zones
        nzones = Object.keys(globalBuildingMap["building"]["floors"][i]["zones"]).length;
        
        // fit in the zones
        var nzoneArraylen = nzones * Math.ceil(sysVariables['max_nzones'] % nzones);
        nzoneArray = new Array(nzones).fill(0);
        for (var j=0; j<sysVariables['max_nzones']; j++) {
            nzoneArray[j%nzones] = nzoneArray[j%nzones] + 1;
        }
        
        // add a clickable link to get the list of appliances for each zone
        for (var j=0; j<nzones; j++) {
            floorRow.append('td')
                        .attr('colspan', nzoneArray[j])
                        .attr('class', 'zone-block clickable-link')
                        .attr('id', 'td-' + 'F' + (i+1).toString() + '_Z' + (j+1).toString())
                        .style('background-color', function() {
                            if (globalRedList.includes(this.id.split('-')[1])) {
                                return "tomato";
                            } else {
                                return "white";
                            }
                        })
                        .on("mouseover", function() { 
                            d3.select(this).style('background-color', 'aqua');
                        })
                        .on("mouseout", function() { 
                            d3.select(this).style('background-color', function() {
                                if (globalRedList.includes(this.id.split('-')[1])) {
                                    return "tomato";
                                } else {
                                    return "white";
                                }
                            })
                        })
                    .append('a')
                        .attr('href', 'javascript:void(0);')
                        .attr('id', 'F' + (i+1).toString() + '_Z' + (j+1).toString())
                        .text('Z' + (j+1).toString())
                    .on('click', function(data) {
                        // print list of appliances for the selected zone
                        printApplianceList('zone', this.id);
                    });
        }
        
        // add a clickable link to get the list of appliances for each floor
        floorRow.append('td')
                    .attr('class', 'floor-block clickable-link')
                    .attr('id', 'td-' + 'F' + (i+1).toString())
                    .style('background-color', function() {
                            if (globalRedList.includes(this.id.split('-')[1])) {
                                return "tomato";
                            } else {
                                return "white";
                            }
                        })
                    .on("mouseover", function() { 
                            d3.select(this).style('background-color', 'aqua');
                        })
                    .on("mouseout", function() { 
                        d3.select(this).style('background-color', function() {
                            if (globalRedList.includes(this.id.split('-')[1])) {
                                return "tomato";
                            } else {
                                return "white";
                            }
                        })
                    })
                .append('a')
                    .attr('href', 'javascript:void(0);')
                    .attr('id', 'F' + (i+1).toString())
                    .text('F' + (i+1).toString())
                    .on('click', function(data) {
                        // print list of appliances for the selected floor
                        printApplianceList('floor', this.id);
                    });
    }
    
    // add a clickable link to get the list of common appliances for the building
    tableBody.append('tr').append('td')
            .attr('scope', 'col')
            .attr('colspan', sysVariables['max_nzones'])
            .attr('class', 'building-block clickable-link')
        .append('a')
            .attr('href', 'javascript:void(0);')
            .attr('id', 'B0')
            .text("Building Loads")
        .on('click', function(data) {
            // print list of appliances for the building
            printApplianceList('building', this.id);
        });
}

// print a list of appliances present in building/floor/zone
function printApplianceList(iType, id) {
    var label = "";
    var cross_tag = "";
    var appliances = [];
    
    // get a list of appliances for building, floor, and zone
    if (iType == "building") {
        label = "Building Loads";
        appliances = globalBuildingMap["building"]["appliances"];
    } else if (iType == "floor") {
        var floor_no = parseInt(id.split('F')[1])

        label = "Floor-" + floor_no.toString() + " Loads"
        appliances = globalBuildingMap["building"]["floors"][floor_no-1]["appliances"];
    } else if (iType == "zone") {
        var floor_no = parseInt(id.split('_')[0].split('F')[1])
        var zone_no = parseInt(id.split('_')[1].split('Z')[1])
        
        label = "Floor-" + floor_no.toString() + " Zone-" + zone_no.toString() + " Loads";
        appliances = globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"];
    }
    
    // clear the previous appliance list
    var applianceDiv = d3.select(".list-of-appliances");
    applianceDiv.selectAll("*").remove();
    
    // add a new appliance list
    var applianceTable = applianceDiv.append('table')
                            .attr('class', 'table table-sm table-bordered appliance-table')
    
    // appliance list heading
    var tableHead = applianceTable.append('thead').append('tr').append('th')
            .attr('scope', 'col')
            .attr('colspan', 3)
            .text(label);
    
    var tableBody = applianceTable.append('tbody')
    
    // add all the appliances
    for (var i=0; i<Object.keys(appliances).length; i++) {

        // label of the appliance
        var appliance = appliances[i].label;

        // tag for unique identification of the appliance
        var app_cross_tag = appliances[i].id;
        
        // add a table row for the appliance
        var tableRow = tableBody.append('tr').attr('id', 'r-' + app_cross_tag);
        
        // clickable link for each appliance
        tableRow.append('td')
                    .attr('class', 'clickable-link')
                    .style('text-align', 'left')
                .append('a')
                    .attr('href', 'javascript:void(0);')
                    .attr('id', 'app-' + app_cross_tag)
                    .text(appliance)
                .on('click', function() {
                    // for each appliance, show a list of data streams available
                    showStreams(this.id.split('-')[1]);
                });

        // appliance selection for control
        checkBoxCell = tableRow.append('td')
                                .append('div')
                                    .attr('class', 'custom-control custom-checkbox')

        checkBoxCell.append('input')
                        .attr('class', 'custom-control-input float-right')
                        .attr('type', 'checkbox')
                        .attr('id', 'chk-' + app_cross_tag)
                        .property('checked', function(){
                            if (this.id in globalApplianceList) {
                                return true
                            } else {
                                return false
                            }
                        })
                    .on('change', function() {
                        updateGlobalList(this.id);
                    });
                  
        checkBoxCell.append('label')
                        .attr('class', 'custom-control-label')
                        .attr('for', 'chk-' + app_cross_tag)
        
        // for each appliance, add a delete button
        tableRow.append('td')
                .append('i')
                    .attr('id', 'del-' + app_cross_tag)
                    .attr('class', 'fas fa-trash-alt')
                .on('click', function(){
                    // on delete, update the building map
                    var tag = this.id.split('-')[1];
                    
                    if (tag.split('_').length == 4) {
                        deleteInfo(tag, "zone_appliance");
                    } else if (tag.split('_').length == 3) {
                        deleteInfo(tag, "floor_appliance");
                    } else if (tag.split('_').length == 2) {
                        deleteInfo(tag, "building_appliance");
                    }

                    d3.select("#r-" + tag).remove()
                });
    }

    applianceTable.append('tfoot')
                    .append('tr')
                    .append('td')
                        .attr('colspan', 3)
                        .style('text-align', 'left')
                    .append('input')
                        .attr('type', 'button')
                        .attr('class', 'btn btn-block btn-secondary')
                        .attr('id', 'add-' + cross_tag)
                        .attr('value', 'Add Appliance')
                    .on('click', function(){
                        console.log(this.id)
                    })
}

function getApplianceList(tag) {

    var tag_list = tag.split('_')
    var app_list = [];
    
    if (tag_list.length == 4) {
        var floor_no = parseInt(tag_list[1].split("f")[1]);
        var zone_no = parseInt(tag_list[2].split("z")[1]);

        app_list = globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"];
        
        var index = app_list.findIndex(function(appliance) {
            return appliance.id == tag;
        });
        
        return app_list[index]

    } else if (tag_list.length == 3) {
        var floor_no = parseInt(tag_list[1].split("f")[1]);

        app_list = globalBuildingMap["building"]["floors"][floor_no-1]["appliances"];
        
        var index = app_list.findIndex(function(appliance) {
            return appliance.id == tag;
        });

        return app_list[index]

    } else if (tag_list.length == 2) {
        app_list = globalBuildingMap["building"]["appliances"]
        
        var index = app_list.findIndex(function(appliance) {
            return appliance.id == tag;
        });

        return app_list[index]
    }

                    
}

function deleteInfo(tag, type) {

    var tag_list = tag.split('_')

    // delete complete building
    if (type == "building") {
        delete globalBuildingMap["building"]
    } 
    // delete an appliance within the building
    else if (type == "building_appliance") {    
        var index = globalBuildingMap["building"]["appliances"].findIndex(function(appliance) {
            return appliance.id == tag;
        });

        globalBuildingMap["building"]["appliances"].splice(index, 1)
    } 
    // delete an appliance measurement stream within the building
    else if (type == "building_appliance_measurement") {
        var index = globalBuildingMap["building"]["appliances"].findIndex(function(appliance) {
            return appliance.id == tag_list.slice(0, 2).join('_');
        });

        var index = globalBuildingMap["building"]["appliances"][index]["measurement"].findIndex(function(measurement) {
            return measurement.p_name == tag;
        });

        globalBuildingMap["building"]["appliances"][index]["measurement"].splice(index, 1)

    } 
    // delete an appliance control stream within the building
    else if (type == "building_appliance_control") {
        var index = globalBuildingMap["building"]["appliances"].findIndex(function(appliance) {
            return appliance.id == tag_list.slice(0, 2).join('_');
        });

        var index = globalBuildingMap["building"]["appliances"][index]["control_inputs"].findIndex(function(control) {
            return control.p_name == tag;
        });

        globalBuildingMap["building"]["appliances"][index]["measurement"].splice(index, 1)
    } 
    // delete a floor
    else if (type == "floor") {
        var floor_no = parseInt(tag_list[1].split("f")[1]);
        globalBuildingMap["building"]["floors"].splice(floor_no-1, 1);
    } 
    // delete a floor appliance
    else if (type == "floor_appliance") {
        var floor_no = parseInt(tag_list[1].split("f")[1]);
        
        var index = globalBuildingMap["building"]["floors"][floor_no-1]["appliances"].findIndex(function(appliance) {
            return appliance.id == tag;
        });
        
        globalBuildingMap["building"]["floors"][floor_no-1]["appliances"].splice(index, 1)
    } 
    // delete an appliance measurement stream of a floor within the building
    else if (type == "floor_appliance_measurement") {
        var floor_no = parseInt(tag_list[1].split("f")[1]);
        
        var index = globalBuildingMap["building"]["floors"][floor_no-1]["appliances"].findIndex(function(appliance) {
            return appliance.id == tag_list.slice(0, 3).join('_');
        });

        var index = globalBuildingMap["building"]["floors"][floor_no-1]["appliances"][index]["measurement"].findIndex(function(measurement) {
            return measurement.p_name == tag;
        });

        globalBuildingMap["building"]["floors"][floor_no-1]["appliances"][index]["measurement"].splice(index, 1)
    } 
    // delete an appliance measurement stream of a floor within the building
    else if (type == "floor_appliance_measurement") {
        var floor_no = parseInt(tag_list[1].split("f")[1]);
        
        var index = globalBuildingMap["building"]["floors"][floor_no-1]["appliances"].findIndex(function(appliance) {
            return appliance.id == tag_list.slice(0, 3).join('_');
        });

        var index = globalBuildingMap["building"]["floors"][floor_no-1]["appliances"][index]["control_inputs"].findIndex(function(control) {
            return control.p_name == tag;
        });

        globalBuildingMap["building"]["floors"][floor_no-1]["appliances"][index]["control_inputs"].splice(index, 1)
    } 
    // delete a zone
    else if (type == "zone") {
        var floor_no = parseInt(tag_list[1].split("f")[1]);
        var zone_no = parseInt(tag_list[2].split("z")[1]);
        
        globalBuildingMap["building"]["floors"][floor_no-1]["zones"].splice(zone_no-1, 1)
    } 
    // delete an appliance within a zone
    else if (type == "zone_appliance") {
        var floor_no = parseInt(tag_list[1].split("f")[1]);
        var zone_no = parseInt(tag_list[2].split("z")[1]);
        
        var index = globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"].findIndex(function(appliance) {
            return appliance.id == tag;
        });
        
        globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"].splice(index, 1)

    } 
    // delete an appliance measurement within a zone
    else if (type == "zone_appliance_measurement") {
        var floor_no = parseInt(tag_list[1].split("f")[1]);
        var zone_no = parseInt(tag_list[2].split("z")[1]);
        
        var index = globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"].findIndex(function(appliance) {
            return appliance.id == tag_list.slice(0, 4).join('_');
        });

        var index = globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"][index]["measurements"].findIndex(function(measurement) {
            return measurement.p_name == tag;
        });

        globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"][index]["measurements"].splice(index, 1)
    } 
    // delete an appliance measurement within a zone
    else if (type == "zone_appliance_control") {
        var floor_no = parseInt(tag_list[1].split("f")[1]);
        var zone_no = parseInt(tag_list[2].split("z")[1]);
        
        var index = globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"].findIndex(function(appliance) {
            return appliance.id == tag_list.slice(0, 4).join('_');
        });

        var index = globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"][index]["control_inputs"].findIndex(function(control) {
            return control.p_name == tag;
        });

        globalBuildingMap["building"]["floors"][floor_no-1]["zones"][zone_no-1]["appliances"][index]["control_inputs"].splice(index, 1)
    }       
}

// show a list of data streams for a selected appliance
function showStreams(appID) {

    var font_size = '1vw'

    // get list of streams
    app_info = getApplianceList(appID);
    
    // show modal and remove previous content 
    $('#stream-list').modal('show');
    d3.select("#mdlbdy-stream-list").selectAll("*").remove();
    
    // add a table for the new list
    var stream_table = d3.select("#mdlbdy-stream-list").append('table')
                            .attr('class', 'table table-sm table-bordered stream-table')
    
    stream_table.append('thead')
                .append('tr')
                .selectAll('th')
                .data(['Label', 'Source Type', 'Parameter Name', 'Source Name', ''])
                .enter()
                .append('th')
                    .attr('scope', 'col')
                    .style('text-align', 'left')
                    .style('font-size', font_size)
                    .text(function(d){return d;})

    var stream_body = stream_table.append('tbody')
    
    // for each stream
    app_info["measurements"].forEach(function(appliance){
        stream_row = stream_body.append('tr').attr('id', 'sr' + appliance["p_id"]);
        
        // data label
        stream_row.append('td')
                    .attr('class', 'form-label')
                    .style('text-align', 'left')
                    .style('font-size', font_size)
                    .text(appliance.label)
        
        // to link it to a data stream
        stream_row.append('td')
                .append('select')
                    .attr('class', 'selectpicker form-control')
                    .attr('title', 'Source Type')
                    .attr('id', 'select-source-type')
                .selectAll('option')
                .data(['file', 'stream'])
                    .enter()
                .append('option')
                    .style('font-size', font_size)
                    .text(function(d) {
                        return d.charAt(0).toUpperCase() + d.slice(1);
                    });

        jQuery('select').selectpicker();

        // to get data from the file
        stream_row.append('td')
                    .style('text-align', 'left')
                    .style('font-size', font_size)
                    .text(appliance.p_name);

        // to get data from the file
        stream_row.append('td')
                .style('text-align', 'left')
                .style('font-size', font_size)
                .text(appliance.source_name);

        // to delete a particular data stream
        stream_row.append('td')
                .append('i')
                    .attr('class', 'fas fa-trash-alt')
                    .attr('id', "del-" + appliance["p_id"])
                .on('click', function() {
                    var tag = this.id.split('-')[1];
                    
                    // on delete, update the global building map
                    if (tag.split('_').length == 5) {
                        deleteInfo(tag, "zone_appliance_measurement");
                    } else if (tag.split('_').length == 4) {
                        deleteInfo(tag, "floor_appliance_measurement");
                    } else if (tag.split('_').length == 3) {
                        deleteInfo(tag, "building_appliance_measurement");
                    }

                    // delete the html code
                    jQuery("#sr" + tag).remove();
                });
    });

    app_info["control_inputs"].forEach(function(appliance){
        stream_row = stream_body.append('tr').attr('id', 'sr' + appliance["p_id"]);
        
        // data label
        stream_row.append('td')
                    .style('text-align', 'left')
                    .style('text-align', 'left')
                    .style('font-size', font_size)
                    .text(appliance.label)
        
        // to link it to a data stream
        stream_row.append('td')
                .append('select')
                    .attr('class', 'selectpicker form-control')
                    .attr('title', 'Source Type')
                    .attr('id', 'select-source-type')
                .selectAll('option')
                .data(['file', 'stream'])
                    .enter()
                .append('option')
                    .style('font-size', font_size)
                    .text(function(d) {
                        return d.charAt(0).toUpperCase() + d.slice(1);
                    });

        jQuery('select').selectpicker();

        // to get data from the file
        stream_row.append('td')
                .style('text-align', 'left')
                .style('font-size', font_size)
                .text(appliance.p_name);

        // to get data from the file
        stream_row.append('td')
                .style('text-align', 'left')
                .style('font-size', font_size)
                .text(appliance.source_name);

        // to delete a particular data stream
        stream_row.append('td')
                .append('i')
                    .attr('class', 'fas fa-trash-alt')
                    .attr('id', "del-" + appliance["p_id"])
                .on('click', function() {
                    var tag = this.id.split('-')[1];
                    
                    // on delete, update the global building map
                    if (tag.split('_').length == 5) {
                        deleteInfo(tag, "zone_appliance_control");
                    } else if (tag.split('_').length == 4) {
                        deleteInfo(tag, "floor_appliance_control");
                    } else if (tag.split('_').length == 3) {
                        deleteInfo(tag, "building_appliance_control");
                    }

                    // delete the html code
                    jQuery("#sr" + tag).remove();
                });
    });
}

// update the global appliance list
function updateGlobalList(id) {
    var tag = id.split('-')[1]
    if (document.getElementById(id).checked) {
        globalApplianceList[tag] = getApplianceList(tag);
    } else {
        delete globalApplianceList[tag]
    }
}

/******************************************************************************************

---------------------------   When Uploading the Building Map    --------------------------
  
*******************************************************************************************/

// load the JSON file
function onFileSelect(event) {
    jQuery('#uploadHelp').text('The file "' + event.target.files[0].name +  '" has been selected.');
    
    var reader = new FileReader();
    reader.onload = onReaderLoad;
    reader.readAsText(event.target.files[0]);
}

// parse the json file, load only if valid
function onReaderLoad(event){
    try {
        fileObj = JSON.parse(event.target.result);
        validBuildingFile = true;
    } catch (e) {
        alert("Invalid JSON, cannot upload!");
    }
}

// file selection event on the upload modal screen
document.getElementById('input-building-map').addEventListener('change', onFileSelect);

// Click event for upload button on the modal screen
jQuery('#btn-upload-selected-file').on('click', function() {

    // close the modal
    $('#mdl-upload-file').modal('hide');

    // if uploaded file is valid
    if (validBuildingFile) {

        // make sure we have the building tree
        get_btree();
        
        // parse the building map and get default appliance list
        globalBuildingMap = fileObj;
        getDefaultAppList();
        
        // get c_indx to show selection on building box
        c_indx = globalBuildingMap["building"]["index"];
        var indx_split = c_indx.split("_");

        // update left most panel
        var tempJSON = globalBuildingTypes;
        for (i = 1; i < indx_split.length-1; i++) {
            tempJSON = tempJSON["children"][(+indx_split[i])-1];
        }
        drw_bld_tree(tempJSON);

        // check the selected building type
        jQuery('#' + globalBuildingMap["building"]["type"]).prop('checked', true);

        // update middle and rightmost containers
        build_floormap();
    }
});

// get default parameters
function getDefaultAppList() {
    jQuery.ajax({
        type: "POST",
        url: "/query",
        async: false,
        data: JSON.stringify({"query_type": "get_default_alist", "build_type": globalBuildingMap["building"]["type"]}),
        dataType : "html",
        contentType: "application/json",
        success: function(response) {
            globalDefaultAppList = JSON.parse(response);
        },
        error: function() {
            alert( "error" );
        }
    });
}

// download the JSON file locally
jQuery('#btn-save-building').on('click', function(){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(globalBuildingMap, null, 2)], {
        type: "json"
    }));
    a.setAttribute("download", "buildingMAP.json");
    document.body.appendChild(a);
    
    a.click();
    document.body.removeChild(a);
});

// plot data streams
function plot_data_streams(parameters, data) {
    
    // update data
    for (var i = 0; i < data.length; i++) {
        data[i]["datetime"] = new Date(new Date(data[i]["datetime"]).getTime() + 1000 * 60 * 60 * 24)
        data[i][parameters[0]] = +data[i][parameters[0]]
        data[i][parameters[1]] = +data[i][parameters[1]]
        data[i][parameters[2]] = +data[i][parameters[2]]; 
    }  
    
    // remove previous plot
    d3.select('#div-chart1').selectAll("*").remove();

    // create new chart plot
    var chart1 = d3_timeseries()
                    .margin.right($('#div-chart1').width()/10)
                    .margin.top($('#div-chart1').width()/10)
                    .xscale.label("Milan")
                    .width($('#div-chart1').width())
                    .height(Math.min($('#div-chart1').width()*2/3, 280));

    // add all the data streams
    parameters.forEach(function(d){
        chart1.addSerie(data,{x:'datetime',y:d},{interpolate:'step-before'})
    });

    // plot the chart
    chart1('#div-chart1');
}

// get data streams from the server
function get_data_streams() {

    // get selected parameters
    var selected = [];
    jQuery("#select-parameter option:selected").each(function(){
        selected.push(this.text);
    });
    
    // request to get data from the server
    $.ajax({
        url: "/query",
        type : "POST",
        data: JSON.stringify({"query_type": "get_data", "parameters":selected, "job_id": globalBuildingMap["id"]}),
        dataType : "html",
        contentType:"application/json",
        success: function(response) {
            // parse and plot data
            var data = JSON.parse(response);
            
            // if no data found, add a notification for the user
            if (jQuery.isEmptyObject(data)) {
                d3.select('#div-chart1')
                    .append('div')
                        .attr('class', 'col-sm-12')
                    .append('div')
                        .attr('class', 'jumbotron')
                    .append('p')
                        .attr('class', 'lead')
                        .text('Sorry, no data found ... ')
            } 
            // if data exists, plot the data
            else {
                plot_data_streams(selected, data);
            }
        },
        error: function(error) {
            console.log("failure!!!");
            console.log(error);
        }
    });
}

// initiate model page
function init_modelpage(response) {
    
    // show model page panels
    jQuery('#input').html(response.page);

    // show parameters in the dropdown 
    globalParametersList = response.parameters;
    var selector = d3.select('#select-parameter')
    var opts = selector.selectAll(null)
                .data(globalParametersList)
                .enter()
                .append('option')
                .attr('value', function (d) {
                    return d
                })
                .text(function (d) {
                    return d
                });

    $('select').selectpicker();

    // on button click, get the data and then plot the data
    jQuery("#btn-plot-data").on('click', function(){
        get_data_streams();
    });

    if (response['status_code'] == 2) {
        jQuery('#training-panel').hide();
        jQuery('#service-panel').show();

        services = response['services'];
        for (var i=0; i<Object.keys(services).length; i++) {
            var key = Object.keys(services)[i];
            addService(key, services[key]["label"]);
        }

        jQuery("#selected-services").on('click', function(){
            plotRankings(services);
        });
    }

}

function addService(key, label) {
    var selectionBox = d3.select('#select-service')
                            .append('div')
                                .attr('class', 'col-md-3 selection-box');

    selectionBox.append('input')
        .attr('class', 'form-check-input')
        .attr('type', 'checkbox')
        .attr('name', 'service-type')
        .attr('id', key)
        .attr('value', key);

    var figure = selectionBox.append('label')
                                .attr('class', 'form-check-label leaf')
                                .attr('for', key)
                            .append('figure');
    
    figure.append('i')
            .attr('class', 'label-image fab fa-servicestack fa-5x');
    
    figure.append('figcaption')
            .attr('class', 'tag')
            .text(label);
}

function plotRankings(services) {
    var service_list = [];
    jQuery.each(jQuery('input[type=checkbox][name=service-type]:checked'), function(){
        service_list.push(jQuery(this).val());
    });
    
    if (service_list.length > 0) {
        
        jQuery('#service-panel').hide();
        jQuery('#ranking-panel').show();

        d3.select("#div-app-rankings").selectAll('*').remove();
        d3.select("#div-app-labels").selectAll('*').remove();

        for (var i=0; i<service_list.length; i++) {
            var key = service_list[i];
            addGridService(key, services[key]["label"], services[key]["ranks"]);
        }

        jQuery('#back-to-selection').on('click', function(){
            jQuery('#ranking-panel').hide();
            jQuery('#service-panel').show();
        });
    } else {
        alert('Please select at least one service.');
    }
}

function addGridService(tag, label, applianceRanking) {
    var dragging = {};
    
    var div = d3.select("#div-app-rankings").append('div').attr('class', 'col-sm-3 ' + tag)
    var margin = {top: 0, right: 0, bottom: 20, left: 0},
        actualWidth = +d3.select('.' + tag).style('width').slice(0, -2)
        actualWidth = actualWidth * 0.65
        width = actualWidth - margin.left - margin.right,
        height = 2*actualWidth - margin.top - margin.bottom;

    var textDiv = d3.select("#div-app-labels").append('div')
                        .attr('class', 'col-sm-3 text-wrap text-left')
                        .text(label)
                        .style("font-size", function(d) { return width * 0.17 + "px"; })
        
    var svg = div
              .append("svg")
                .attr("class", 'mx-auto')
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .style("margin-left", margin.left + "px")
              .append("g")
                .attr("id", "matrix")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    var applianceMatrix = [], 
        appliances = Object.keys(applianceRanking),
        n = appliances.length;
    
    appliances.forEach(function(app, i){
        applianceMatrix[i] = {x: i, y: +applianceRanking[app]-1, z: app};
    });
    
    var y = d3.scaleBand().range([0, height], 0, 1),
        c = d3.scaleOrdinal(d3.schemeCategory10).domain(d3.range(n));
    
    // Default order
    var orders = {
        appliance: d3.range(n).sort(function(a, b) { return d3.ascending(applianceMatrix[a].y, applianceMatrix[b].y); })
    };
    
    // The default sort order.
    y.domain(orders.appliance);
    
    svg.append("rect")
      .attr("class", "background")
      .attr("width", width)
      .attr("height", height);
    
    
    var row = svg.selectAll("." + tag + "G")
                    .data(applianceMatrix)
                        .enter()
                    .append("g")
                        .attr("class", tag + "G")
                        .attr("transform", function(d, i) { 
                            return "translate(0," + y(d.y) + ")"; 
                        })
                    
    row.append("rect")
        .attr("x", 0)
        .attr("width", width * 0.75)
        .attr("height", y.bandwidth())
        .attr("fill", 'None')
        .style("stroke", function(d) { 
            return c(d.y); 
        })
        .style("stroke-width", 2);
    
    row.append("image")
        .attr("id", tag + "Image")
        .attr("x", width * 0.8)
        .attr("y", y.bandwidth() * 0.23)
        .attr("width", width * 0.12)
        .attr("height", y.bandwidth())
        .attr('class', 'row-simage')
        .style('cursor', 'pointer')
        .attr('xlink:href', 'static/images/icons/cancel.png');
    
    row.append("rect")
        .attr("x", width * 0.75)
        .attr("width", width * 0.25)
        .attr("height", y.bandwidth())
        .attr("fill", 'None')
        .style("stroke", function(d) { 
            return c(d.y); 
        })
        .style("stroke-width", 0)
        .style("padding-top", 4)
        .attr("fill", "url(#" + tag + "Image)");
    
    row.append("text")
        .attr("class", tag + "Rect")
        .attr("x", width * 0.05)
        .attr("dy", y.bandwidth() * 0.6)
        .style("font-size", function(d) { return y.bandwidth() * 0.35 + "px"; })
        .style("cursor", "pointer")
        .text(function(d) { 
            return appliances[d.y]; 
        });
    
    var drag_behavior = d3.drag();
    var trigger;
    
    d3.selectAll("." + tag + "G")
        .call(d3.drag()
                .subject(function(d) { 
                    return {y: y(d.y)}; 
                })
                .on("start", function(d) {
                    trigger = d3.event.sourceEvent.target.className.baseVal;
                    
                    if (trigger == tag + "Rect") {
                        d3.selectAll("." + tag + "Rect").attr("opacity", 1);
                        dragging[d.y] = y(d.y);
                        
                        // Move the row that is moving on the front
                        sel = d3.select(this);
                        sel.moveToFront();
                    }
                })
                .on("drag", function(d) {
                    // Hide what is in the back
                    
                    if (trigger == tag + "Rect") {
                        dragging[d.y] = Math.min(height, Math.max(-1, d3.event.y));
                        orders.appliance.sort(function(a, b) { 
                            return position(a) - position(b); 
                        });
                        
                        y.domain(orders.appliance);
                        
                        d3.selectAll("." + tag + "G").attr("transform", function(d, i) {
                            return "translate(0," + position(d.y) + ")"; 
                        });
                    }
                })
                .on("end", function(d) {
                    if (trigger == tag + "Rect") {
                        delete dragging[d.y];
                        
                        transition(d3.select(this)).attr("transform", "translate(0," + position(d.y) + ")");
                    }
                })
        );
    
    d3.selection.prototype.moveToFront = function() {
        return this.each(function(){
            this.parentNode.appendChild(this);
        });
    };

    function position(d) {
        var v = dragging[d];
        return v == null ? y(d) : v;
    }

    function transition(g) {
        return g.transition().duration(500);
    }
}

// on initiating model training
jQuery('#btn-learn-model').on('click', function(){
    $.ajax({
        url: "/query",
        type : "POST",
        data: JSON.stringify({'query_type': 'train', 'map': globalBuildingMap, 'appliances': globalApplianceList}),
        dataType : "html",
        contentType:"application/json",
        success: function(response) {
            res = JSON.parse(response)
            if (res['status_code'] == 0) {
                alert("Couldn't Connect to the Controller!");
            } else {
                alert("Initiating Controller");
                init_modelpage(res);
            }
        },
        error: function(error) {
            console.log("failure!!!");
            console.log(error);
        }
    });
});
