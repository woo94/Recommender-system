export function btToAge(bt: number): number {
    const today = new Date()
    const t_year = today.getFullYear();
	const t_month = today.getMonth() + 1;
    const t_date = today.getDate();

    const b_year = Math.floor(bt / 10000)
    const b_month = Math.floor((bt - (b_year * 10000)) / 100)
    const b_date = bt - (b_year * 10000) - (b_month * 100)
    
    let age = t_year - b_year
    if(t_month < b_month) {
        age -= 1
    }
    else if(t_month === b_month) {
        if(t_date < b_date ) {
            age -= 1
        }
    }

    return age
}

export function getRandomNumMinToMax(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}