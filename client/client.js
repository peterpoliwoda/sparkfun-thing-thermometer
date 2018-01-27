function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getDayFilesList() {
    $.get('/days', function(data) {
        if (data && Array.isArray(data)) {
            for (var key in data) {
                $('#datePicker').append('<option>' + data[key] + '</option>');
            }
            var selectedDay = getToday() + '.txt';
            $('#datePicker').val(selectedDay).change();
        }
    });
}

function getTemperatureForDay(dayFileName, callback) {
    $.get('/temperature/' + dayFileName, function(data) {
        if (data) {
            callback(null, data);
        } else {
            callback(data, null);
        }
    });
}

function updateCurrentTemp(temp, when) {
    // Update last recorded temperature and when it was taken
    $('#temp').text(temp);
    $('#tempTime').text(moment(when).fromNow());
}

function updateGraph(dayFileName, callback) {
    dayFileName = dayFileName || getToday() + '.txt';
    getTemperatureForDay(dayFileName, function(err, data) {
        if (err) {
            console.log('ERROR getting file data');
        }
        var labels = [];
        var tempData = [];
        var outsideData = [];

        var lines = data.split('\n');
        var tempTime;
        var temp;
        lines.forEach(function(line) {
            if (line.length && !~line.indexOf('-127.00') && !~line.indexOf('85.00')) {
                tempTime = line.split(' ')[0];
                temp = line.split(' ')[1];
                labels.push(tempTime);
                tempData.push(temp);
                outsideData.push(line.split(' ')[2] || 0);
            }
        });

        // Create graph
        var ctx = document.getElementById('tempChart').getContext('2d');
        var myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: tempData,
                    label: 'Room temperature',
                    borderColor: '#4bc0c0',
                    fill: false
                }, {
                    data: outsideData,
                    label: 'Outside temperature',
                    borderColor: '#3e95cd',
                    fill: false
                }]
            },
            options: {
                title: {
                    display: true,
                    text: 'Living room temperature per minute (in °C)'
                },
                scales: {
                    xAxes: [{
                        type: 'time',
                        distribution: 'linear'
                    }]
                }
            }
        });

        callback(temp, tempTime);
    });
}

$('#datePicker').change(function() {
    var datePicked = $('#datePicker option:selected').val();
    updateGraph(datePicked, function(temp, when) {
        var today = getToday();
        if (when && when.split('T') && when.split('T')[0] == today) {
            updateCurrentTemp(temp, when);
        }
    });
});

getDayFilesList();
