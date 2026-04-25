import { fontSize, fontWeight } from '@mui/system';

export default function componentStyleOverrides(theme) {
    const bgColor = theme.colors?.grey50;
    return {
        MuiButton: {
            styleOverrides: {
                sizeSmall: {
                    padding: '4px 10px',
                    minWidth: 'auto',
                    fontSize: '0.75rem'
                },
                iconSizeSmall: {
                    marginRight: 4,
                    '& .MuiSvgIcon-fontSizeSmall': {
                        fontSize: 14
                    }
                },
                root: {
                    fontWeight: 500,
                    borderRadius: '8px',
                    boxShadow: 'none',
                    padding: '0.3rem 0.65rem'
                },
                containedDark: {
                    color: theme.colors?.grey200
                }
            }
        },
        MuiDialogActions: {
            styleOverrides: {
                root: {
                    padding: '1rem 1.5rem',
                    backgroundColor: theme.colors?.grey200
                }
            }
        },
        MuiDialogContent: {
            styleOverrides: {
                root: {
                    padding: '2rem 1.5rem'
                }
            }
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    boxShadow: 'none'
                }
            }
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0
            },
            styleOverrides: {
                root: {
                    backgroundImage: 'none'
                },
                rounded: {
                    borderRadius: `${theme?.customization?.borderRadius}px`
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderColor: theme.colors?.grey100,
                    color: theme.colors?.grey500,
                    padding: '16px 32px',
                    backgroundColor: 'white',
                    fontSize: '1.08rem',
                    textTransform: 'capitalize',
                },
                head: {
                    color: theme.colors?.grey800,
                    backgroundColor: theme.colors?.grey50,
                    maxHeight: '56.5px'
                }
            }
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:hover .MuiTableCell-body': {
                        cursor: 'pointer',
                        backgroundColor: theme.colors?.grey100
                    },
                    '&:last-child td, &:last-child th': { 
                        border: 0 
                    }
                }
            }
        },
        MuiCardHeader: {
            styleOverrides: {
                root: {
                    color: theme.colors?.textDark,
                    padding: '24px'
                },
                title: {
                    fontSize: '1.125rem'
                }
            }
        },
        MuiCardContent: {
            styleOverrides: {
                root: {
                    padding: '24px'
                }
            }
        },
        MuiCardActions: {
            styleOverrides: {
                root: {
                    padding: '24px'
                }
            }
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    color: theme.darkTextPrimary,
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    '&.Mui-selected': {
                        color: theme.colors.primaryDark,
                        backgroundColor: theme.colors.primaryLight,
                        '&:hover': {
                            backgroundColor: theme.colors.primaryLight
                        },
                        '& .MuiListItemIcon-root': {
                            color: theme.colors.primaryDark
                        }
                    },
                    '&:hover': {
                        backgroundColor: theme.colors.primaryLight
                        // color: theme.colors.primaryMain,
                        // '& .MuiListItemIcon-root': {
                        //     color: theme.colors.primaryMain,
                        // }
                    }
                }
            }
        },
        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    color: theme.darkTextPrimary,
                    minWidth: '36px'
                }
            }
        },
        MuiListItemText: {
            styleOverrides: {
                primary: {
                    color: theme.textDark
                }
            }
        },
        MuiInputBase: {
            styleOverrides: {
                input: {
                    color: theme.textDark,
                    '&::placeholder': {
                        color: theme.darkTextSecondary,
                        fontSize: '0.875rem'
                    }
                }
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    background: bgColor,
                    borderRadius: `${theme?.customization?.borderRadius}px`,
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.colors?.grey400
                    },
                    '&:hover $notchedOutline': {
                        borderColor: theme.colors?.primaryLight
                    },
                    '&.MuiInputBase-multiline': {
                        padding: 1
                    }
                },
                input: {
                    fontWeight: 500,
                    padding: '15.5px 14px',
                    borderRadius: `${theme?.customization?.borderRadius}px`,
                    '&.MuiInputBase-inputSizeSmall': {
                        padding: '12px 16px',
                        '&.MuiInputBase-inputAdornedStart': {
                            paddingLeft: 0
                        }
                    }
                },
                inputAdornedStart: {
                    paddingLeft: 4
                },
                notchedOutline: {
                    borderRadius: `${theme?.customization?.borderRadius}px`
                }
            }
        },
        MuiAutocomplete: {
            styleOverrides: {
                inputRoot: {
                    paddingLeft: '16px !important',
                    paddingTop: '9.5px !important',
                    paddingBottom: '9.5px !important'
                },
                input: {
                    paddingLeft: '0 !important',
                    borderRadius: '0 !important'
                },
                popper: {
                    border: '1px solid gray'
                }
            }
        },
        MuiSlider: {
            styleOverrides: {
                root: {
                    '&.Mui-disabled': {
                        color: theme.colors?.grey300
                    }
                },
                mark: {
                    backgroundColor: theme.paper,
                    width: '4px'
                },
                valueLabel: {
                    color: theme?.colors?.primaryLight
                }
            }
        },
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: theme.divider,
                    opacity: 1
                }
            }
        },
        MuiAvatar: {
            styleOverrides: {
                root: {
                    color: theme.colors?.primaryDark,
                    background: theme.colors?.primary200
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    '&.MuiChip-deletable .MuiChip-deleteIcon': {
                        color: 'inherit'
                    },
                    fontWeight: 'bold'
                }
            }
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    color: theme.paper,
                    background: theme.colors?.grey700
                }
            }
        },
        MuiPickersDay: {
            styleOverrides: {
                root: {
                    color: 'black'
                }
            }
        }
    };
}
