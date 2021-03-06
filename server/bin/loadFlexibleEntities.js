var app = require('../server');
var lodash = require('lodash');
var async = require('async');
var colors = require('colors/safe');

var mysql      = require('mysql');

const args = process.argv;

var inputSheetName = process.argv[2];

var inputFileName = "FlexibleEntities.xlsx";

if(typeof require !== 'undefined') XLSX = require('xlsx');

/* Call XLSX */
var workbook = XLSX.readFile(inputFileName);

var sheet_name_list = workbook.SheetNames;
var flexEntitiesList = [];
var flexEntityColumnsList = [];

var dataSource = app.dataSources.plmdev;

async.waterfall(
[
    function(callback) {
	  	
		sheet_name_list.forEach(function(y) {
			
			if (inputSheetName == 'All' && y == "FlexibleEntities") {
				console.log("++++++ Loading "+y);
			  	var worksheet = workbook.Sheets[y];
			    var flexEntities =   XLSX.utils.sheet_to_json(worksheet, {raw: true});
			    console.log(flexEntities);

			    var PlmFlexibleEntities = app.models.PlmFlexibleEntities;
		        var count = flexEntities.length;

			    for (var idx=0; idx < count; idx++) {
			    	
					var flexEntity = {
					  "entityName": flexEntities[idx]["entityName"],
					  "entityDesc": flexEntities[idx]["entityDesc"],
					  createdAt: new Date(),
					  lastModifiedAt: new Date()
					}

					PlmFlexibleEntities.create(flexEntity, function(err, flexEntityRecord) {
			            if (err) return console.log(err);

			            flexEntitiesList.push({"entityName": flexEntityRecord.entityName,
			            	"id": flexEntityRecord.id
			        	});

			            count--;

			            if (count === 0) {
			              //dataSource.disconnect();
			              
			              var caption = "	√√ "+y+" Loading : Done ";
			              console.log(colors.green(caption));
			              callback(null, flexEntitiesList);
			              //process.exit();
			            }
			        });
			    }	           	
			}
		});
    },
    function(flexEntitiesList, callback) {

    	sheet_name_list.forEach(function(y) {
			if (inputSheetName == 'All' && y == "FlexibleEntitiesColumns") {
				console.log("Loading "+y);
			  	var worksheet = workbook.Sheets[y];
			    var flexEntColumns =   XLSX.utils.sheet_to_json(worksheet, {raw: true});
			    var groupedFlexEntColumns = lodash.groupBy(flexEntColumns, "entityName");
			    
			    // Load FlexibleEntitiesColumns
			    var PlmFlexibleEntitiesColumns = app.models.PlmFlexibleEntitiesColumns;
			    var count = flexEntColumns.length;

			    Object.keys(groupedFlexEntColumns).forEach(function(key) {
				    flexEntColumns = groupedFlexEntColumns[key];
				    
				    var idx = 0;
				    flexEntColumns.forEach(function(flexEntColumnIn) {
				    	idx += 1;

				    	var pickedFlexEntity= lodash.filter(flexEntitiesList, 
					        	{ 'entityName':  flexEntColumnIn["entityName"]} );

				      	var flexEntColumn = {
						  "entityId": pickedFlexEntity[0].id,
						  "entityFieldName": flexEntColumnIn["entityFieldName"],
						  "dbColumnName": "attr"+idx,
						  "createdAt": new Date(),
						  "lastModifiedAt": new Date()
						}

				       PlmFlexibleEntitiesColumns.create(flexEntColumn, function(err, flexEntColumnRecord) {
				        if (err) return console.log(err);

				        count--;

				        flexEntityColumnsList.push({
				        	"entityName": flexEntColumnIn.entityName,
				        	"entityId": flexEntColumnRecord.entityId, 
				        	"entityFieldName": flexEntColumnRecord.entityFieldName , 
				        	"dbColumnName": flexEntColumnRecord.dbColumnName 
				        });

				        if (count === 0) {
				          console.log(flexEntityColumnsList)
				          var caption = "	√√ "+ y + " Loading : Done ";
				          callback(null, flexEntityColumnsList, callback);
				        }
				      });
				    });

				});	    
			}
		});
    },
    function(flexEntityColumnsList, callback) {

    	sheet_name_list.forEach(function(y) {
			if ((inputSheetName == 'All' || y == inputSheetName ) && 
				y !== "FlexibleEntitiesColumns" && y !== "FlexibleEntities") {
				console.log("================ Loading "+y);

				var pickedFlexEntity = lodash.filter(flexEntityColumnsList, 
					        	{ 'entityName':  y} );

				console.log(pickedFlexEntity);
				if (pickedFlexEntity.length > 0) {

					var worksheet = workbook.Sheets[y];
				    var flexEntColumnValues =   XLSX.utils.sheet_to_json(worksheet, {raw: true});

				    var PlmFlexibleEntityValues = app.models.PlmFlexibleEntityValues;
				    var count = flexEntColumnValues.length;
				    
				    var flexEntColumnValue = {
		    			"entityId": pickedFlexEntity[0].entityId,
		    			"createdAt": new Date(),
				  		"lastModifiedAt": new Date()
		    		};

				    flexEntColumnValues.forEach(function(flexEntColumnValueIn) {

				    	Object.keys(flexEntColumnValueIn).forEach(function(key) {
				    		console.log('key : '+key);
				    		console.log('value : '+flexEntColumnValueIn[key]);
				    		var pickedFlexEntityColumn= lodash.filter(pickedFlexEntity, 
					        	{ 'entityFieldName':  key} );
				    		console.log('pickedFlexEntityColumn : '+pickedFlexEntityColumn);

				    		flexEntColumnValue[pickedFlexEntityColumn[0].dbColumnName] = flexEntColumnValueIn[key];
				    	});
				    
				    	PlmFlexibleEntityValues.create(flexEntColumnValue, 
				    		function(err, flexEntColumnValueRecord) 
				    	{
					        if (err) return console.log(err);

					        count--;
					        console.log("Pending PlmFlexibleEntityValues records "+count)
					        if (count === 0) {
					          var caption = "	√√ "+ y + " Loading : Done ";
					        }
					    });
				    });

				}

			  	    
			}
		});
    },
    function(caption, callback) {
		callback(null, caption);
    }
],
  	function (err, caption) {
  		if (!err) {
  			console.log(colors.green(caption));	
  		} else {
  			console.log(colors.red(caption));	
  		}
    	
    	process.exit();
  	}
);



