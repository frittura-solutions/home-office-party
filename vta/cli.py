"""This module contains a CLI interface"""

import player

def main():
    import argparse

    CLI_DESC = "It is a simple python package to play videos in the terminal using colored characters as pixels or other usefull outputs"
    EPILOG = ("\033[1;37mThanks for trying video-to-ascii!\033[0m")

    PARSER = argparse.ArgumentParser(prog='video-to-ascii', description=CLI_DESC, epilog=EPILOG)
    PARSER.add_argument('--strategy', default='filled-ascii', type=str, dest='strategy', 
        choices=["ascii-color", "just-ascii", "filled-ascii"], help='choose an strategy to render the output', action='store')
    ARGS = PARSER.parse_args()

    try:
        player.play(strategy=ARGS.strategy)
    except (KeyboardInterrupt):
        pass

if __name__ == '__main__':
    main()
