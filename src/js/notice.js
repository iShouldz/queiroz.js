
/*!
 * Queiroz.js: notice.js
 * JavaScript Extension for Dimep Kairos
 * https://github.com/viniciusknob/queiroz.js
 */

(function(Notification, Queiroz) {

    /* Modules */

    var
        Settings  = Queiroz.settings,
        mod       = Queiroz.module,
        Time      = mod.time,
        Strings   = mod.strings;

    /* Class Definition */

    var Notice = function() {

        /* Constants */

        var NOTICE_RANGE_MINUTES = Settings.NOTICE_RANGE_MINUTES;

        /* Private Functions */

        var
            _notified = true,
            _formatMessage = function(message, minute) {
                return message.replace('_min_', minute);
            },
            _notify = function(title, message) {
                new Notification(title, {
                    body: message,
                    icon: Settings.NOTICE_ICON
                });

                _notified = true;
            },
            _checkWeeklyGoal = function(title, data) {
                if (_notified)
                    return;

                NOTICE_RANGE_MINUTES.forEach(function(minute) {
                    if ((Settings.WEEKLY_GOAL_MINUTES - minute) == Time.millisToMinute(data.reallyWorked))
                        _notify(title, _formatMessage(Strings('noticeWeeklyGoal'), minute));
                });
            },
            _checkDailyGoal = function(title, data) {
                if (_notified)
                    return;

                NOTICE_RANGE_MINUTES.forEach(function(minute) {
                    data.days.forEach(function(day) {
                        if ((Settings.DAILY_GOAL_MINUTES - minute) == Time.millisToMinute(day.reallyWorked))
                            _notify(title, _formatMessage(Strings('noticeDailyGoal'), minute));
                    });
                });
            },
            _checkMaxDaily = function(title, data) {
                if (_notified)
                    return;

                NOTICE_RANGE_MINUTES.forEach(function(minute) {
                    data.days.forEach(function(day) {
                        if ((Settings.MAX_DAILY_MINUTES - minute) == Time.millisToMinute(day.reallyWorked))
                            _notify(title, _formatMessage(Strings('noticeMaxDaily'), minute));
                    });
                });
            },
            _checkMaxConsecutive = function(title, data) {
                if (_notified)
                    return;

                NOTICE_RANGE_MINUTES.forEach(function(minute) {
                    data.days.forEach(function(day) {
                        day.periods.forEach(function(time, index) {
                            if (time.out == false && day.date.isToday())
                                if ((Settings.MAX_CONSECUTIVE_MINUTES - minute) == Time.millisToMinute(time.shift))
                                    _notify(title, _formatMessage(Strings('noticeMaxConsecutive'), minute));
                        });
                    });
                });
            };

        /* Public Functions */

        return {
            check: function(data) {
                _notified = false;

                var title = Queiroz.name + " - " + data.date.getTimeAsString();

                _checkWeeklyGoal(title, data);
                _checkDailyGoal(title, data);
                _checkMaxDaily(title, data);
                _checkMaxConsecutive(title, data);
            },
            isGranted: function() {
                return Notification && Notification.permission == 'granted';
            },
            requestPermission: function() {
                if (Notification) {
                    Notification.requestPermission().then(function(status) {
                        Queiroz.reload();
                    });
                }
            }
        };
    }();

    /* Module Definition */

    Queiroz.module.notice = Notice;

})(Notification, Queiroz);