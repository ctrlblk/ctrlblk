export default {
    name: 'overlay-buster.js',
    fn: overlayBuster,
};

function overlayBuster() {
    if ( typeof self.addEventListener !== 'function' ) { return; }
    let count = 0;
    const maxChecks = 50;
    const checkInterval = 200;
    const isOverlay = function(element) {
        if ( element === null || element === document.documentElement || element === document.body ) {
            return false;
        }
        const style = self.getComputedStyle(element);
        if ( style === null ) { return false; }
        const zIndex = parseInt(style.zIndex, 10);
        if ( isNaN(zIndex) || zIndex < 1000 ) { return false; }
        const position = style.position;
        if ( position !== 'fixed' && position !== 'absolute' ) { return false; }
        const rect = element.getBoundingClientRect();
        const viewportWidth = self.innerWidth;
        const viewportHeight = self.innerHeight;
        if ( rect.width < viewportWidth * 0.5 || rect.height < viewportHeight * 0.5 ) {
            return false;
        }
        return true;
    };
    const removeOverlay = function() {
        count += 1;
        if ( count > maxChecks ) { return; }
        const centerX = self.innerWidth / 2;
        const centerY = self.innerHeight / 2;
        const element = document.elementFromPoint(centerX, centerY);
        if ( isOverlay(element) ) {
            element.remove();
            document.documentElement.style.setProperty('overflow', 'auto', 'important');
            document.body.style.setProperty('overflow', 'auto', 'important');
        }
    };
    self.addEventListener('DOMContentLoaded', function() {
        const intervalId = setInterval(function() {
            removeOverlay();
            if ( count >= maxChecks ) {
                clearInterval(intervalId);
            }
        }, checkInterval);
    });
}
