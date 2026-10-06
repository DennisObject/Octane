export const GetMaxVisitorsList = (hasVip: boolean, currentMaxVisitors: number): number[] => {
    const maximum = hasVip ? 75 : 50;
    const list: number[] = [];

    for (let value = 10; value <= maximum; value += 5) list.push(value);

    if (currentMaxVisitors > maximum) list.push(maximum);

    return list;
};

export const GetSelectedMaxVisitors = (options: number[], currentMaxVisitors: number): number =>
    options.includes(currentMaxVisitors) ? currentMaxVisitors : currentMaxVisitors > options[options.length - 1] ? options[options.length - 1] : options[0];
