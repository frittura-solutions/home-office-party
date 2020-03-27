const formatDate = dateStr => {
    let date = new Date(dateStr);
    let days = ["Mon", "Tue", "Wed", "Thu", "Fr", "Sat", "Sun"];
    let fmt = days[date.getDay()] + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    return fmt;
}

const htmlToElement = html => {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}