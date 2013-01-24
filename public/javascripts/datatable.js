/* requires:
<script type="text/javascript" src="javascripts/yahoo_yui_2.8.1/yahoo-dom-event/yahoo-dom-event.js"></script> 
<script type="text/javascript" src="javascripts/yahoo_yui_2.8.1/element/element-min.js"></script> 
<script type="text/javascript" src="javascripts/yahoo_yui_2.8.1/datasource/datasource-min.js"></script>
<script type="text/javascript" src="javascripts/yahoo_yui_2.8.1/datatable/datatable-min.js"></script>
 */

var historyTableSelectedRow, historyTableSelectedData, tblHistory;
var historyTableRowSerialNumber = 1;
function setUpHistoryTable(selectRowOfTableEventHandler) {
    var hideScore = true;
	var myColumnDefs = [ 
	{key:"serial", label:"#", width:15}, 
	{key:"proposer", label:"Proposer", width:60}, 
	{key:"proposerClass", label:"Proposer", width:1, hidden:true}, 
	{key:"action", label:"Action", width:50}, 
	{key:"bid", label:"Offer", width:370}, 
	{key:"util", label:"Your score", width:50, hidden:hideScore}
	];

	var tblHistorySource = new YAHOO.util.LocalDataSource("[]");
	tblHistorySource.responseType = YAHOO.util.XHRDataSource.TYPE_JSARRAY; 
	tblHistorySource.responseSchema = {fields:[{key:"serial",parser:'number'}, "proposer","action", "bid", "util"]};

	var myRowFormatter = function(elTr, oRecord) { 
		if (oRecord.getData('answered')=="yes") { 
			//			YAHOO.util.Dom.addClass(elTr, 'mark'); 
		}
		YAHOO.util.Dom.addClass(elTr, oRecord.getData('proposerClass')); 
		return true; 
	};
	var myRowSelector = function(elTr, oRecord) { 
		historyTableSelectedRow =  this.getSelectedRows()[0]; // Erel: remember the row for use with accept/reject
		historyTableSelectedData = this.getRecordSet().getRecord(historyTableSelectedRow)._oData;  // Erel: remember the data for use with accept/reject
		if (selectRowOfTableEventHandler)
            selectRowOfTableEventHandler(historyTableSelectedData);
		return true;
	};

	tblHistory = new YAHOO.widget.ScrollingDataTable("tblHistoryContainer", 
			myColumnDefs, tblHistorySource,  
			{  selectionMode:"single",   
		height: "180px",
		formatRow: myRowFormatter
			});
	tblHistory.subscribe("rowMouseoverEvent", tblHistory.onEventHighlightRow); 
	tblHistory.subscribe("rowMouseoutEvent", tblHistory.onEventUnhighlightRow); 
	tblHistory.subscribe("rowClickEvent", tblHistory.onEventSelectRow); 
	tblHistory.subscribe("rowSelectEvent", myRowSelector);
} // end of function setUpHistTable()


function addDataToHistoryTable(data) {
	data.serial = historyTableRowSerialNumber;
	historyTableRowSerialNumber++;
	
	tblHistory.addRow(data);
	tblHistory.scrollTo(tblHistory.getLastTrEl());
}
