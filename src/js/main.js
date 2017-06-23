
/*!
 * Queiroz.js: main.js
 * JavaScript Extension for Dimep Kairos
 * https://github.com/viniciusknob/queiroz.js
 */

(function(window, View, Time, Util, Snippet) {

    /* Constants */

    var NAME = 'QueirozJS';


    /* Module Definition */

    var Queiroz = function() {

        /* CONSTANTS */

        var
            _NAME = 'Queiroz.js',
            VERSION = '0.0.0',

            Settings = {
                INITIAL_WEEKDAY: Time.Weekday.MONDAY,
                LAST_WEEK_MODE: false, // false, ON, DOING, DONE
                MAX_CONSECUTIVE_HOURS_PER_DAY: 6,
                MAX_HOURS_PER_WEEK: 44,
                MAX_MINUTES_PER_DAY: (8 * 60) + 48,
                USERSCRIPT_DELAY_MILLIS: 1000
            },

            Selector = {
                COLUMN_DAY: '.DiaApontamento',
                CHECKPOINT: '.FilledSlot span',
                DATE: '[id^=hiddenDiaApont]',
                HEADER: '#SemanaApontamentos div',
                TIME_IN: '.TimeIN,.TimeINVisualizacao'
            };

        /* PRIVATE */

        var
            _getMaxHoursPerWeekInMillis = function() {
                return Time.Hour.toMillis(Settings.MAX_HOURS_PER_WEEK);
            },
            _getMaxConsecutiveHoursPerDayInMillis = function() {
                return Time.Hour.toMillis(Settings.MAX_CONSECUTIVE_HOURS_PER_DAY);
            },
            _getMaxMinutesPerDayInMillis = function() {
                return Time.Minute.toMillis(Settings.MAX_MINUTES_PER_DAY);
            };


        var data = {
            week: {
                laborTime: {
                    millis: 0, human: '', html: ''
                },
                balanceTime: {
                    millis: 0, human: '', html: ''
                },
                pendingTime: {
                    millis: 0, human: '', html: ''
                },
                extraTime: {
                    millis: 0, human: '', html: ''
                },
                _computePendingTimeInMillis: function() {
                    return _getMaxHoursPerWeekInMillis() - this.laborTime.millis;
                },
                _computeExtraTimeInMillis: function() {
                    return this.laborTime.millis - _getMaxHoursPerWeekInMillis();
                },
                _buildHumanBalanceTime: function() {
                    var millis = this.balanceTime.millis;
                    if (millis == 0) {
                        return Time.zero;
                    } else if (millis > 0) {
                        return '+' + Time.Millis.toHumanTime(millis);
                    } else if (millis < 0) {
                        return '-' + Time.Millis.toHumanTime(millis * -1);
                    }
                },
                buildTime: function() {
                    this.pendingTime.millis = this._computePendingTimeInMillis();
                    this.extraTime.millis = this._computeExtraTimeInMillis();
                },
                buildHumanTime: function() {
                    this.laborTime.human = Time.Millis.toHumanTime(this.laborTime.millis);
                    this.balanceTime.human = this._buildHumanBalanceTime();
                    this.pendingTime.human = Time.Millis.toHumanTime(this.pendingTime.millis > 0 ? this.pendingTime.millis : 0);
                    this.extraTime.human = Time.Millis.toHumanTime(this.extraTime.millis > 0 ? this.extraTime.millis : 0);
                },
                buildHtmlTime: function() {
                    this.laborTime.html = Snippet.headerLaborTime(this.laborTime.human);
                    this.balanceTime.html = Snippet.headerBalanceTime(this.balanceTime.human);
                    this.pendingTime.html = Snippet.headerWeekPendingTime(this.pendingTime.human);
                    this.extraTime.html = Snippet.headerExtraTime(this.extraTime.human);
                }
            },
            today: {
                laborTime: {
                    millis: 0
                }
            }
        };

        var
            _lastInDate = '',
            _getCheckpoints = function(eDay) {
                return View.getAll(Selector.CHECKPOINT, eDay);
            },
            _getDate = function(eDay) {
                return View.get(Selector.DATE, eDay).value;
            },
            _buildTimeToLeave = function() {
                if (data.week.pendingTime.millis <= 0) {
                    return '';
                }
                if (data.week.pendingTime.millis > _getMaxMinutesPerDayInMillis()) {
                    return '';
                }

                var htmlHumanTimeToLeave = '';
                if (_lastInDate) {
                    var timeToLeaveInMillis = _lastInDate.getTime() + data.week.pendingTime.millis;
                    if (!timeToLeaveInMillis || timeToLeaveInMillis < new Date().getTime()) {
                        return '';
                    }

                    var humanTimeToLeave = Time.dateToHumanTime(new Date(timeToLeaveInMillis));
                    htmlHumanTimeToLeave = Snippet.headerWeekTimeToLeave(humanTimeToLeave);
                }
                return htmlHumanTimeToLeave;
            },
            _getPendingOrExtraTime = function() {
                return data.week.pendingTime.millis >= 0 ? data.week.pendingTime.html : data.week.extraTime.html;
            },
            _buildHtmlHeader = function(args) {
                var header = Snippet.header();
                args.forEach(function(element) {
                    if (element) {
                        header.appendChild(element);
                    }
                });
                return header;
            },
            _renderStats = function() {
                data.week.buildHumanTime();
                data.week.buildHtmlTime();

                var
                    htmlLastWeekModeOn = Settings.LAST_WEEK_MODE ? Snippet.headerLastWeekModeOn() : '',
                    htmlPendingOrExtraTime = _getPendingOrExtraTime(),
                    htmlHumanTimeToLeave = _buildTimeToLeave();

                var
                    args = [
                        htmlLastWeekModeOn,
                        data.week.laborTime.html,
                        data.week.balanceTime.html,
                        htmlPendingOrExtraTime,
                        htmlHumanTimeToLeave
                    ],
                    html = _buildHtmlHeader(args);

                View.append(Selector.HEADER, html);
            },
            _buildStats = function() {
                if (Settings.LAST_WEEK_MODE === 'ON') {
                    Settings.LAST_WEEK_MODE = 'DOING';
                }

                data.week.buildTime();

                if (Settings.LAST_WEEK_MODE !== 'DOING') {
                    _renderStats();
                }
            },
            _renderLaborTimePerShift = function(context, shift, finished) {
                if (shift < 0) shift = 0; // normalize
                var humanMillis = Time.Millis.toHumanTime(shift);
                var html = Snippet.laborTimePerShift(humanMillis, finished);
                var container = document.createElement('div');
                container.appendChild(html);
                var filledSlotOut = context.parentNode;
                filledSlotOut.parentNode.insertBefore(html, filledSlotOut.nextSibling);
            },
            _renderLaborTimePerDay = function(eDay, millis) {
                var humanMillis = Time.Millis.toHumanTime(millis);
                eDay.appendChild(Snippet.laborTimePerDay(humanMillis));
            },
            _renderBalanceTimePerDay = function(eDay, laborTimeInMillis) {
                var
                    max = _getMaxMinutesPerDayInMillis(),
                    millis = 0,
                    humanMillis = Time.zero;

                if (laborTimeInMillis < max) {
                    millis = max - laborTimeInMillis;
                    humanMillis = '-' + Time.Millis.toHumanTime(millis);
                    if (Time.isToday(Time.toDate(_getDate(eDay) + " " + Time.fake)) == false) {
                        data.week.balanceTime.millis -= millis;
                    }
                } else if (laborTimeInMillis > max) {
                    millis = laborTimeInMillis - max;
                    humanMillis = '+' + Time.Millis.toHumanTime(millis);
                    if (Time.isToday(Time.toDate(_getDate(eDay) + " " + Time.fake)) == false) {
                        data.week.balanceTime.millis += millis;
                    }
                }
                eDay.appendChild(Snippet.balanceTimePerDay(humanMillis));
            },
            _renderTodayTimeToLeave = function(context, inputMillis) {
                var pendingTime = _getMaxMinutesPerDayInMillis() - data.today.laborTime.millis;
                var timeToLeaveInMillis = inputMillis + (pendingTime < 0 ? 0 : pendingTime);
                var humanTimeToLeave = Time.dateToHumanTime(new Date(timeToLeaveInMillis));
                var html = Snippet.todayTimeToLeave(humanTimeToLeave);
                var filledSlotOut = context.parentNode;
                filledSlotOut.parentNode.insertBefore(html, filledSlotOut.nextSibling);
            },
            _analyzeDay = function(eDay) {
                var checkpoints = _getCheckpoints(eDay);
                if (checkpoints.length) {
                    var millis = 0;
                    View.getAll(Selector.TIME_IN, eDay).forEach(function(inElement, index) {
                        var
                            inText = inElement.textContent, // 15:45
                            inDate = Time.toDate(_getDate(eDay) + " " + inText), // typeOf inDate == Date
                            outElement = checkpoints[(index * 2) + 1];

                        if (outElement && !outElement.parentElement.classList.contains('LastSlot')) { // TODO
                            var
                                outText = outElement.textContent, // 04:34
                                outDate = Time.toDate(_getDate(eDay) + " " + outText),  // typeOf outDate == Date
                                shiftInMillis = Time.Millis.diff(inDate, outDate);

                            millis += shiftInMillis;

                            if (Settings.LAST_WEEK_MODE !== 'DOING') {
                                _renderLaborTimePerShift(outElement, shiftInMillis, true);
                            }
                            if (Time.isToday(inDate)) {
                                data.today.laborTime.millis += shiftInMillis;
                            }
                        } else {
                            _lastInDate = inDate;
                            if (Time.isToday(inDate)) {
                                _renderTodayTimeToLeave(inElement, inDate.getTime());
                            }
                            var diffUntilNow = Time.Millis.diff(inDate, new Date());
                            if (diffUntilNow < (_getMaxConsecutiveHoursPerDayInMillis())) {
                                var shiftInMillisUntilNow = millis + diffUntilNow;
                                _renderLaborTimePerShift(inElement, shiftInMillisUntilNow, false);
                            }
                        }
                    });
                    if (millis > 0) {
                        data.week.laborTime.millis += millis;
                        _renderLaborTimePerDay(eDay, millis);
                    }
                    _renderBalanceTimePerDay(eDay, millis);
                }
            },
            _selectDaysToAnalyze = function() {
                var
                    _selectedDays = [],
                    _foundInitialWeekday = false,
                    _eDays = View.getAll(Selector.COLUMN_DAY);

                _eDays.forEach(function(eDay) {
                    var
                        _stringDay = _getDate(eDay) + " " + Time.fake,
                        _dateDay = Time.toDate(_stringDay);

                    if (data.week.laborTime.millis === 0) { // first time
                        if (_foundInitialWeekday || (_foundInitialWeekday = _dateDay.getDay() === Settings.INITIAL_WEEKDAY)) {
                            _selectedDays.push(eDay);
                        }
                    } else { // second time
                        if (_dateDay.getDay() === Settings.INITIAL_WEEKDAY) {
                            Settings.LAST_WEEK_MODE = 'DONE';
                        } else {
                            if (Settings.LAST_WEEK_MODE === 'DOING') {
                                _selectedDays.push(eDay);
                            }
                        }
                    }
                });
                return _selectedDays;
            },
            _init = function() {
                View.append('head', Snippet.STYLE);
                var _selectedDays = _selectDaysToAnalyze();
                _selectedDays.forEach(_analyzeDay);
                _buildStats();

                if (Settings.LAST_WEEK_MODE === 'DOING') {
                    mudarSemana(1, true);
                    setTimeout(_initWithDelay, 1000);
                }
            },
            _initWithDelay = function() {
                var interval = setInterval(function() {
                    if (View.get(Selector.CHECKPOINT)) {
                        clearInterval(interval);
                        _init();
                    }
                }, Settings.USERSCRIPT_DELAY_MILLIS);
            };

        /* PUBLIC */

        return {
            bless: function(lastWeekMode) {
                Settings.LAST_WEEK_MODE = lastWeekMode ? 'ON' : false;
                if (Settings.LAST_WEEK_MODE === 'ON') {
                    mudarSemana(-1, true);
                    setTimeout(_initWithDelay, 1000);
                } else {
                    if (View.get(Selector.CHECKPOINT)) {
                        _init();
                    } else {
                        _initWithDelay();
                    }
                }
                return _NAME + ' ' + VERSION;
            },
            name: _NAME,
            version: VERSION
        };
    }();

    window[NAME] = Queiroz;

})(window, view, time, util, snippet);