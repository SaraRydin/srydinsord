#!/usr/bin/env python3
"""Beräknar svenska helgdagar (röda dagar) för ett givet år.

Körs som: python helgdagar.py [år]
Om inget år anges används innevarande år.
"""

import argparse
from datetime import date, timedelta

VECKODAGAR = ["måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag"]


def paskdagen(year: int) -> date:
    """Påskdagens datum enligt Meeus/Jones/Butcher-algoritmen (gregoriansk kalender)."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def lordag_i_intervall(start: date, slut: date) -> date:
    """Den lördag som infaller inom det angivna datumintervallet (inklusive)."""
    d = start
    while d.weekday() != 5:  # 5 = lördag
        d += timedelta(days=1)
    assert d <= slut
    return d


def helgdagar(year: int) -> list[tuple[date, str]]:
    """Alla svenska röda dagar för ett år, sorterade på datum."""
    pask = paskdagen(year)

    dagar = [
        (date(year, 1, 1), "Nyårsdagen"),
        (date(year, 1, 6), "Trettondedag jul"),
        (pask - timedelta(days=2), "Långfredagen"),
        (pask, "Påskdagen"),
        (pask + timedelta(days=1), "Annandag påsk"),
        (date(year, 5, 1), "Första maj"),
        (pask + timedelta(days=39), "Kristi himmelsfärdsdag"),
        (pask + timedelta(days=49), "Pingstdagen"),
        (lordag_i_intervall(date(year, 6, 20), date(year, 6, 26)), "Midsommardagen"),
        (lordag_i_intervall(date(year, 10, 31), date(year, 11, 6)), "Alla helgons dag"),
        (date(year, 12, 25), "Juldagen"),
        (date(year, 12, 26), "Annandag jul"),
    ]

    # Sveriges nationaldag blev röd dag 2005 och ersatte då Annandag pingst.
    if year >= 2005:
        dagar.append((date(year, 6, 6), "Sveriges nationaldag"))
    else:
        dagar.append((pask + timedelta(days=50), "Annandag pingst"))

    return sorted(dagar, key=lambda x: x[0])


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Visa svenska helgdagar (röda dagar) för ett år."
    )
    parser.add_argument(
        "ar",
        type=int,
        nargs="?",
        default=date.today().year,
        help="Årtal (standard: innevarande år)",
    )
    args = parser.parse_args()

    print(f"Svenska helgdagar {args.ar}:\n")
    for d, namn in helgdagar(args.ar):
        print(f"{d.isoformat()}  {VECKODAGAR[d.weekday()]:<8} {namn}")


if __name__ == "__main__":
    main()
