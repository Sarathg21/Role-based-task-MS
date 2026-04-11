
import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char == '{':
                stack.append(('{', i + 1))
            elif char == '}':
                if not stack:
                    print(f"Extra closing brace at line {i+1}")
                else:
                    stack.pop()
            elif char == '[':
                stack.append(('[', i + 1))
            elif char == ']':
                if not stack or stack[-1][0] != '[':
                    print(f"Mismatched closing bracket at line {i+1}")
                else:
                    stack.pop()
            elif char == '(':
                stack.append(('(', i + 1))
            elif char == ')':
                if not stack or stack[-1][0] != '(':
                    print(f"Mismatched closing parenthesis at line {i+1}")
                else:
                    stack.pop()
    
    for item, line in stack:
        print(f"Unclosed {item} from line {line}")

if __name__ == "__main__":
    check_braces(sys.argv[1])
