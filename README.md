# HafteKhabis-telegrom-bot

A Telegram bot that allows you to play Hafte Khabis with your friends.

## Installation

1. Clone this repository and `cd` into it:
    ```
    git clone https://github.com/mans82/haftekhabis-telegram-bot.git
    cd haftekhabis-telegram-bot
    ```
2. Install dependencies:
   ```
   npm install
   ```
3. Save your bot token in `token.txt`:
   ```
   echo '123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' > token.txt
   ```
4. Run!
   ```
   npm start
   ```

## How to contribute

Any sort of contribution, even the smallest ones, are appreciated. Here are some ways of contribution:

1. Contributing code  
2. Adding/improving translations  
   You can find translations files in *dialogues/* directory. When adding or editing translations files, please consider formatting them properly. You can find details about formatting them later on.  
3. Reporting bugs (by opening issues)

## Translation files format

Each translation file contains one JSON object.
```
{
    "string1": ["Single line"],
    "string2": ["Line1", "Line2", "Line3"]
}
```
Each string is linked to an array that contains the translation. Each element of the array represents one line of the translated text, which makes it possible to have multiline text. Therefore, in the above example, each string is interpreted as below:
```
string1:
Single Line

string2:
Line1
Line2
Line3
```
