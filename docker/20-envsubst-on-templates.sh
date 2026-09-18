#!/bin/sh
set -eu

template_dir="/etc/nginx/templates"
output_dir="/etc/nginx/conf.d"

for template in "$template_dir"/*.template; do
    [ -f "$template" ] || continue
    filename="$(basename "$template")"
    output="$output_dir/${filename%.template}"

    echo "20-envsubst-on-templates.sh: Rendering $template to $output"
    envsubst '$JUMPSERVER_URL' < "$template" > "$output"
done
