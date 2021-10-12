Vue.component("charts", {
    template:   '<div v-if="data" id="charts">' +
                    '<div id="charts_header" class="chart"><div class="chart_canvas_container"><div class="text-large">{{ data.Name }}</div><div>{{ data.Url }}</div></div><div :class="avgResponseTimeClass"><div class="text-large">{{ prettifyNumber(data.AvgResponseTime) }}ms</div><div>Average response time</div></div></div>' +
                    '<chart class="chart" :prettifyNumber="prettifyNumber" :dataApi="data.Errors" type="Errors" :colorHEX="colors.errors"></chart>' +
                    '<chart class="chart" :prettifyNumber="prettifyNumber" :dataApi="data.Warnings" type="Warnings" :colorHEX="colors.warnings"></chart>' +
                    '<chart class="chart" :prettifyNumber="prettifyNumber" :dataApi="data.Operations" type="Operations" :showAverage="false" :colorHEX="colors.operations"></chart>' +
                    '<div id="charts_info"><div>Last error: {{ data.LastErrorStr }}</div><div>Since last sync: {{ timer }}</div><div>Daily error count: {{ data.DailyErrorCount }}</div></div>' +
                '</div>',
    data () {
      return {
          seconds: 1,
          data: null,
          timer: '',
          timerInterval: null,
          timerTimeout: null,
          dataInterval: null,
          dataTimeout: null,
          colors: {
              errors: 'E23333',
              warnings: 'CB9B47',
              operations: '2699FB',
          }
      }
    },
    watch: {
        data: function () {
            this.setTimer()
        }
    },
    created () {
        this.getData()
        this.setTimer()
        this.createInterval()
    },
    computed: {
        avgResponseTimeClass: function () {
            let className = 'chart_data'
            let responseTime = this.data.AvgResponseTime
            if (responseTime <= this.data.AvgResponseTimeWarningLimit) {
                return className
            } else if (responseTime > this.data.AvgResponseTimeWarningLimit && responseTime <= this.data.AvgResponseTimeAlertLimit) {
                return className + ' warning'
            } else {
                return className + ' error'
            }
        }
    },
    methods: {
        createInterval () {
            this.timerInterval = setInterval(() => {
                this.setTimer()
            }, 1000)
        },
        prettifyNumber (x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
        },
        getData() {
            fetch("https://visualsoft.com.pl/rekrutacja/202009/dane")
                .then(response => response.json())
                .then(data => (this.data = data))
        },
        setTimer() {
            if (this.data) {
                if (this.seconds > 20) {
                    this.seconds = 0
                    this.getData()
                }
                const now = new Date()
                const sync = new Date(this.data.LastSyncStr + ':00')
                let diff = new Date(now - sync)
                let hours = diff.getHours()
                let minutes = diff.getMinutes()
                let seconds = diff.getSeconds()
                let timer = ''
                if (hours > 0) timer += hours + ' h '
                if (minutes > 0 || hours > 0) timer += minutes + ' min '
                timer += seconds + ' sec'
                this.timer = timer
                this.seconds++
            }
        }
    }
})


Vue.component("chart", {
    props: {
        dataApi: {
            type: Array,
            required: true
        },
        colorHEX: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        showAverage: {
            type: Boolean,
            default: true
        },
        prettifyNumber: {
            type: Function,
            required: true
        }
    },
    template: '<div><div class="chart_canvas_container"><canvas ref="bar-chart"></canvas></div><div class="chart_data" :style="color"><div class="text-large">{{ prettifyNumber(sum) }}</div><div><template v-if="showAverage">( {{ prettifyNumber(average) }} )</template></div><div>{{ type }} in last hour</div></div></div>',
    watch: {
        dataApi: function () {
            this.prepareData()
            this.initChart()
        }
    },
    computed: {
        color: function () {
            return 'color: #' + this.colorHEX + ';'
        },
        average: function () {
            return Math.round(this.totalSum / this.dataChangeIteration)
        }
    },
    data () {
        return {
            sum: 0,
            totalSum: 0,
            dataChangeIteration: 0,
            chart: null,
            data: null
        }
    },
    mounted () {
        this.prepareData()
        this.initChart()
    },
    methods: {
        prepareData () {
            let sum = 0
            let values = []
            for (let i in this.dataApi) {
                let value = this.dataApi[i].Value
                values.push(value)
                sum += value
            }
            this.data = values
            this.sum = sum
            this.totalSum += sum
            this.dataChangeIteration++
        },
        initChart () {
            if (this.chart) this.chart.destroy()
            this.chart = new Chart(this.$refs['bar-chart'], {
                type: 'bar',
                data: {
                    labels: this.data,
                    datasets: [
                        {
                            backgroundColor: "#" + this.colorHEX,
                            data: this.data,
                            barPercentage: 0.4,
                            categoryPercentage: 1.0,
                        }
                    ]
                },
                options: {
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            bottom: 0
                        }
                    },
                    animation: {
                        duration: 0
                    },
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false,
                        },
                        title: {
                            display: false,
                        },
                        tooltip: {
                            enabled: false,
                            external: function(context) {
                                let tooltipEl = document.getElementById('chartjs-tooltip');
                                if (!tooltipEl) {
                                    tooltipEl = document.createElement('div');
                                    tooltipEl.id = 'chartjs-tooltip';
                                    tooltipEl.innerHTML = '<table></table>';
                                    document.body.appendChild(tooltipEl);
                                }

                                let tooltipModel = context.tooltip;
                                if (tooltipModel.opacity === 0) {
                                    tooltipEl.style.opacity = 0;
                                    return;
                                }

                                tooltipEl.classList.remove('above', 'below', 'no-transform');
                                if (tooltipModel.yAlign) {
                                    tooltipEl.classList.add(tooltipModel.yAlign);
                                } else {
                                    tooltipEl.classList.add('no-transform');
                                }

                                function getBody(bodyItem) {
                                    return bodyItem.lines;
                                }

                                if (tooltipModel.body) {
                                    let bodyLines = tooltipModel.body.map(getBody);
                                    let innerHtml = '<tbody>';
                                    bodyLines.forEach(function(body, i) {
                                        let colors = tooltipModel.labelColors[i];
                                        let style = 'color:' + colors.backgroundColor;
                                        style += '; font-weight: 300'
                                        style += "; font-family: 'Lato', sans-serif"
                                        let span = '<span style="' + style + '">' + body[0] + '</span>';
                                        innerHtml += '<tr><td>' + span + '</td></tr>';
                                    });
                                    innerHtml += '</tbody>';
                                    let tableRoot = tooltipEl.querySelector('table');
                                    tableRoot.innerHTML = innerHtml;
                                }

                                let position = context.chart.canvas.getBoundingClientRect();
                                let bodyFont = Chart.helpers.toFont(tooltipModel.options.bodyFont);
                                tooltipEl.style.opacity = 1;
                                tooltipEl.style.position = 'absolute';
                                tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX - 25 + 'px';
                                tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel._chart.height + 'px';
                                tooltipEl.style.font = bodyFont.string;
                                tooltipEl.style.padding = tooltipModel.padding + 'px ' + tooltipModel.padding + 'px';
                                tooltipEl.style.pointerEvents = 'none';
                            }
                        }
                    },
                    scales: {
                        y: {
                            display: false
                        },
                        x: {
                            display: false
                        }
                    },
                },
            });
        }
    }
})


new Vue({
    el: "#app",
})
