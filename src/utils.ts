export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const formatMoney = (amount: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);

export const formatDate = (dateInput: any) => {
    try {
        if (!dateInput) return '';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { return ''; }
};

export const parseDate = (str: string) => {
    if(!str) return new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
};

export const getCycleRange = (targetDate: Date, closingDayParam: any) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const closingDay = parseInt(closingDayParam) || 1; 

    const lastDayOfCurrentMonth = new Date(year, month + 1, 0).getDate();
    const actualEndDay = Math.min(closingDay, lastDayOfCurrentMonth);
    const end = new Date(year, month, actualEndDay);

    const lastDayOfPrevMonth = new Date(year, month, 0).getDate(); 
    const actualPrevEndDay = Math.min(closingDay, lastDayOfPrevMonth);
    const start = new Date(year, month - 1, actualPrevEndDay);
    start.setDate(start.getDate() + 1);

    return { start, end };
};

export const getAccountDetailRange = (targetDate: Date, account: any, defaultClosingDay: any) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    if (account.type === 'credit' && account.statementDate) {
        const statementDay = parseInt(account.statementDate) || 1; 
        const end = new Date(year, month, statementDay);
        const start = new Date(year, month - 1, statementDay);
        start.setDate(start.getDate() + 1);
        return { start, end };
    } else {
        const closingDay = (parseInt(account.cycleStartDay) || parseInt(defaultClosingDay) || 31);
        return getCycleRange(targetDate, closingDay);
    }
};
