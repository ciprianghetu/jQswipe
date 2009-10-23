/**
 * jQswipe 0.0.1 - Swipe event for jQuery.
 *
 * based on "Safari Web Content Guide > Handling Events > Handling Multi-Touch Events"
 * http://bit.ly/Q6uOD
 *
 * http://github.com/dinoboff/jQswipe/
 *
 * Copyright (c) 2009 Damien Lebrun
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 *     * Redistributions of source code must retain the above copyright notice,
 *       this list of conditions and the following disclaimer.
 * 
 *     * Redistributions in binary form must reproduce the above copyright notice,
 *       this list of conditions and the following disclaimer in the documentation
 *       and/or other materials provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */
 
 
 (function() {
    var window = this,
    $ = window.jQuery;
    
    $.jQswipe = {};

    $.jQswipe.Point = function(x, y) {
        this.x = x;
        this.y = y;
    };

    $.jQswipe.Point.prototype.diff = function(point) {
        return {
            x: this.x - point.x,
            y: this.y - point.y
        };
    };

    $.jQswipe.Point.prototype.toString = function() {
        return 'x: ' + this.x + ', y: ' + this.y;
    };

    $.jQswipe.Point.fromTouch = function(touch) {
        return new $.jQswipe.Point(touch.pageX, touch.pageY);
    };

    $.jQswipe.protoSwipe = {
        dataPrefix: 'events.special.swipe',

        bound: {
            minLength: 30,
            maxWidth: 10
        },

        start: function(el, touches) {
            var currentPoint;

            if (touches.length === 1) {
                currentPoint = $.jQswipe.Point.fromTouch(touches[0]);
                this.cancelled(el, false);
                this.ended(el, false);
                this.startPoint(el, currentPoint);
                this.currentPoint(el, currentPoint);
            } else {
                this.cancelled(el, true);
            }
        },

        update: function(el, touches) {
            var newPoint;

            if (this.cancelled(el)) {
                return;
            }

            if (touches && touches.length === 1) {
                this.previousPoint(el, this.currentPoint(el));
            } else {
                this.cancelled(el, true);
                return;
            }

            newPoint = $.jQswipe.Point.fromTouch(touches[0]);
            if (this.validate(el, newPoint)) {
                this.currentPoint(el, newPoint);
            } else {
                this.cancelled(el, true);
            }
        },

        validate: function(el, newPoint) {
            // validate swipe (a right swipe by default)
            var diffWithStart = newPoint.diff(this.startPoint(el)),
                diffWithPrevious = newPoint.diff(this.previousPoint(el));
            
            // Should not be hight or too low
            if (diffWithStart.y > this.bound.maxWidth || diffWithStart.y < -this.bound.maxWidth) {
                return false;
            }

            // should not move back to the left
            if (diffWithPrevious.x < 0) {
                return false;
            }

            // If swipe ended, the swipe be long enough
            if (this.ended(el) && diffWithStart.x < this.bound.minLength) {
                return false;
            }

            return true;
        },

        end: function(el) {
            this.ended(el, true);
            
            // we don't need to update it if it's already true
            if (this.cancelled(el) === false &&
                this.validate(el, this.currentPoint(el)) === false
            ) {
                this.cancelled(el, true);
            }
        },

        data: function(el, name, value) {
            var result = $(el).data(this.dataPrefix + '.' + name, value);
            if (value === undefined) {
                return result;
            }
        },

        startPoint: function(el, point) {
            return this.data(el, 'start', point);
        },

        previousPoint: function(el, point) {
            return this.data(el, 'previous', point);
        },

        currentPoint: function(el, point) {
            return this.data(el, 'current', point);
        },

        cancelled: function(el, cancelled) {
            return this.data(el, 'cancelled', cancelled);
        },

        ended: function(el, ended) {
            return this.data(el, 'ended', ended);
        },
        
        getTouches: function() {
            var warn = window.console && window.console.warn || function () {},
                touches = window.event && window.event.targetTouches;
            if (touches === undefined) {
                warn('No window.event.targetTouches');
            }
            return touches;
        }
    };

    $.jQswipe.Swipe = function(evenType, validator) {
        var that = this;

        evenType = evenType || 'swipe';
        this.validate = validator || $.jQswipe.protoSwipe.validate;
        this.dataPrefix = 'events.special.' + evenType;

        this.setup = function(data, namespaces) {
            var $el = $(this);
            $el.bind('touchstart', that.startHandler);
            $el.bind('touchmove', that.moveHandler);
            $el.bind('touchcancel', that.cancelHandler);
            $el.bind('touchend', that.endHandler);
        };

        this.teardown = function(namespaces) {
            var $el = $(this);
            $el.unbind('touchstart', that.startHandler);
            $el.unbind('touchmove', that.moveHandler);
            $el.unbind('touchcancel', that.cancelHandler);
            $el.unbind('touchend', that.endHandler);
        };

        that.startHandler = function() {
            that.start(this, that.getTouches());
        };

        that.moveHandler = function() {
            that.update(this, that.getTouches());
        };

        that.cancelHandler = function() {
            that.cancelled(this, true);
        };

        that.endHandler = function(event) {
            that.end(this);

            if (that.cancelled(this) === false) {
                event.type = evenType;
                $.event.handle.apply(this, arguments);
            }

        };
    };

    $.jQswipe.Swipe.prototype = $.jQswipe.protoSwipe;
    
    $.jQswipe.register = function(type, validator) {
        $.event.special[type] = new this.Swipe(type, validator);
    };
    
    $.jQswipe.register('swipe');
    $.jQswipe.register('rightSwipe');
    $.jQswipe.register('leftSwipe', function(el, newPoint) {
        var diffWithStart = newPoint.diff(this.startPoint(el)),
            diffWithPrevious = newPoint.diff(this.previousPoint(el));

        // Should not be hight or too low
        if (diffWithStart.y > this.bound.maxWidth || diffWithStart.y < -this.bound.maxWidth) {
            return false;
        }

        // should not move back to the left
        if (diffWithPrevious.x >= 0) {
            return false;
        }

        // If swipe ended, the swipe be long enough
        if (this.ended(el) && diffWithStart.x > -this.bound.minLength) {
            return false;
        }

        return true;
    });
    
    $.fn.swipe = function(cb) {
        return $(this).bind('swipe', cb);
    };

})();