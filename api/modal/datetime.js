
let getTime = () => {
    
    let date_ob = new Date();
    
    // current date
    // adjust 0 before single digit date
    let date = ("0" + date_ob.getDate()).slice(-2);

    // current month
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    // current year
    let year = date_ob.getFullYear();
    
    // current hours
    let hours = date_ob.getHours();
    
    // current minutes
    let minutes = date_ob.getMinutes();

    if (minutes < 10) {
        minutes = '0' + minutes
    }

    

    // current seconds
    let seconds = date_ob.getSeconds();
    
    if (seconds < 10) {
        seconds = '0' + seconds
    }

    // prints date & time in YYYY-MM-DD HH:MM:SS format
    return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

}

let myDate = (date) => {
        
        let year = date.slice(0, 4)
        let month = date.slice(5, 7)
        let day = date.slice(8, 11) 
        
        if (month === "01") {
            month = "January"
        } else if (month === "02") {
            month = "February"
        } else if (month === "03") {
            month = "March"
        } else if (month === "04") {
            month = "April"
        } else if (month === "05") {
            month = "May"
        } else if (month === "06") {
            month = "June"
        } else if (month === "07") {
            month = "July"
        } else if (month === "08") {
            month = "August"
        } else if (month === "09") {
            month = "September"
        } else if (month === "10") {
            month = "October"
        } else if (month === "11") {
            month = "November"
        } else if (month === "12") {
            month = "December"
        }
        
        date = day + " " + month + " " + year
        
        return date;
    }


module.exports = { getTime , myDate }
